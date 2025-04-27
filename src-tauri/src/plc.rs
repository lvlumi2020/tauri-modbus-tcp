use lazy_static::lazy_static;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::Duration;
use tauri::AppHandle;
use thiserror::Error;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio::time;

use crate::modbus::{ModbusError, MODBUS_MANAGER};
use crate::notice::{notify_bool, notify_dword, notify_float, notify_word};

#[derive(Error, Debug)]
pub enum TaskError {
    #[error("任务未找到: 客户端 ID {client_id}, 地址 {address}")]
    TaskNotFound { client_id: i64, address: u16 },

    #[error("Modbus 错误: {0}")]
    ModbusError(#[from] ModbusError),

    #[error("应用句柄未设置")]
    AppHandleNotSet,

    #[error("其他错误: {0}")]
    Other(String),
}

type Result<T> = std::result::Result<T, TaskError>;

pub struct TaskScheduler {
    tasks: Arc<Mutex<HashMap<i64, TaskDefinition>>>,
    tasks_by_interval: Arc<Mutex<HashMap<u64, HashSet<i64>>>>,
    timer_handle: Arc<Mutex<Option<JoinHandle<()>>>>,
    counter: Arc<Mutex<u64>>,
    running: Arc<Mutex<bool>>,
    app: Arc<Mutex<Option<AppHandle>>>,
}

lazy_static! {
    pub static ref TASK_SCHEDULER: TaskScheduler = TaskScheduler::new();
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum DataType {
    Bool = 1,
    Word = 2,
    Dword = 3,
    Float = 4,
}

impl From<u8> for DataType {
    fn from(value: u8) -> Self {
        match value {
            1 => DataType::Bool,
            2 => DataType::Word,
            3 => DataType::Dword,
            4 => DataType::Float,
            _ => DataType::Word, // 默认为 Word 类型
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct TaskDefinition {
    pub client_id: i64,
    pub address: u16,
    pub data_type: DataType,
    pub interval_ms: u64,
}

impl TaskScheduler {
    pub fn new() -> Self {
        TaskScheduler {
            tasks: Arc::new(Mutex::new(HashMap::new())),
            tasks_by_interval: Arc::new(Mutex::new(HashMap::new())),
            timer_handle: Arc::new(Mutex::new(None)),
            counter: Arc::new(Mutex::new(0)),
            running: Arc::new(Mutex::new(false)),
            app: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn set_app_handle(&self, app: AppHandle) {
        let mut app_handle = self.app.lock().await;
        *app_handle = Some(app);
    }

    fn generate_task_id(client_id: i64, address: u16) -> i64 {
        (client_id << 16) | (address as i64)
    }

    pub async fn register_task(
        &self,
        client_id: i64,
        interval_ms: u64,
        address: u16,
        data_type: u8,
    ) -> Result<()> {
        // 验证间隔时间
        if interval_ms == 0 {
            return Err(TaskError::Other("间隔时间不能为零".to_string()));
        }

        let data_type = DataType::from(data_type);
        let task_id = Self::generate_task_id(client_id, address);
        let task = TaskDefinition {
            client_id,
            address,
            data_type,
            interval_ms,
        };

        // 添加任务到任务列表
        let mut tasks = self.tasks.lock().await;
        tasks.insert(task_id, task);

        // 添加任务到间隔索引
        let mut tasks_by_interval = self.tasks_by_interval.lock().await;
        let group = tasks_by_interval
            .entry(interval_ms)
            .or_insert_with(HashSet::new);
        group.insert(task_id);

        Ok(())
    }

    pub async fn unregister_task(&self, client_id: i64, address: u16) -> Result<()> {
        let task_id = Self::generate_task_id(client_id, address);
        let mut tasks = self.tasks.lock().await;

        if let Some(task) = tasks.remove(&task_id) {
            let mut tasks_by_interval = self.tasks_by_interval.lock().await;
            if let Some(group) = tasks_by_interval.get_mut(&task.interval_ms) {
                group.remove(&task_id);
                if group.is_empty() {
                    tasks_by_interval.remove(&task.interval_ms);
                }
            }
            Ok(())
        } else {
            Err(TaskError::TaskNotFound { client_id, address })
        }
    }

    pub async fn start(&self) -> Result<()> {
        let mut running = self.running.lock().await;
        if *running {
            return Ok(());
        }

        // 检查是否设置了应用句柄
        {
            let app = self.app.lock().await;
            if app.is_none() {
                return Err(TaskError::AppHandleNotSet);
            }
        }

        let tasks = self.tasks.clone();
        let tasks_by_interval = self.tasks_by_interval.clone();
        let counter = self.counter.clone();
        let running_clone = self.running.clone();
        let app = self.app.clone();

        let handle = tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_millis(1));

            loop {
                interval.tick().await;

                let should_run = {
                    let running = running_clone.lock().await;
                    *running
                };

                if !should_run {
                    break;
                }

                // 更新计数器
                let current_counter = {
                    let mut counter = counter.lock().await;
                    *counter = counter.wrapping_add(1);
                    *counter
                };

                // 确定要执行的任务
                let tasks_to_execute = {
                    let tasks_by_interval = tasks_by_interval.lock().await;
                    let mut result = Vec::new();
                    for (interval_ms, task_ids) in tasks_by_interval.iter() {
                        if current_counter % *interval_ms == 0 {
                            result.extend(task_ids.iter().cloned());
                        }
                    }
                    result
                };

                // 执行任务
                let app_handle = app.lock().await;
                if let Some(app_handle) = app_handle.as_ref() {
                    let tasks = tasks.lock().await;
                    for task_id in tasks_to_execute {
                        if let Some(task) = tasks.get(&task_id) {
                            Self::execute_task(app_handle.clone(), task).await;
                        }
                    }
                }
            }
        });

        let mut timer_handle = self.timer_handle.lock().await;
        *timer_handle = Some(handle);
        *running = true;

        Ok(())
    }

    async fn execute_task(app_handle: AppHandle, task: &TaskDefinition) {
        match task.data_type {
            DataType::Bool => {
                if let Ok(values) = MODBUS_MANAGER
                    .read_coils(task.client_id, task.address, 1)
                    .await
                {
                    if let Some(&value) = values.first() {
                        notify_bool(app_handle.clone(), task.client_id, task.address, value);
                    }
                }
            }
            DataType::Word => {
                if let Ok(values) = MODBUS_MANAGER
                    .read_holding_registers(task.client_id, task.address, 1)
                    .await
                {
                    if let Some(&value) = values.first() {
                        notify_word(app_handle.clone(), task.client_id, task.address, value);
                    }
                }
            }
            DataType::Dword => {
                if let Ok(values) = MODBUS_MANAGER
                    .read_holding_registers(task.client_id, task.address, 2)
                    .await
                {
                    if values.len() >= 2 {
                        let value = (values[1] as u32) << 16 | (values[0] as u32);
                        notify_dword(app_handle.clone(), task.client_id, task.address, value);
                    }
                }
            }
            DataType::Float => {
                if let Ok(values) = MODBUS_MANAGER
                    .read_holding_registers(task.client_id, task.address, 2)
                    .await
                {
                    if values.len() >= 2 {
                        let bits = (values[1] as u32) << 16 | (values[0] as u32);
                        let value = f32::from_bits(bits);
                        notify_float(app_handle.clone(), task.client_id, task.address, value);
                    }
                }
            }
        }
    }

    pub async fn stop(&self) -> Result<()> {
        let mut running = self.running.lock().await;
        if !*running {
            return Ok(());
        }

        *running = false;

        let mut timer_handle = self.timer_handle.lock().await;
        if let Some(handle) = timer_handle.take() {
            handle.abort();
        }

        Ok(())
    }
}

pub async fn initialize(app: AppHandle) -> Result<()> {
    TASK_SCHEDULER.set_app_handle(app).await;
    TASK_SCHEDULER.start().await
}
