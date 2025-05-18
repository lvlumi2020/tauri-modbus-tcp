use lazy_static::lazy_static;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::Duration;
use thiserror::Error;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio::time;

use crate::modbus::{ModbusError, MODBUS_MANAGER};
use crate::notice::{notify_bool, notify_dword, notify_float, notify_word};

#[derive(Error, Debug)]
pub enum PLCError {
    #[error("任务未找到: 客户端 ID {client_id}, 地址 {address}")]
    TaskNotFound { client_id: i64, address: u16 },

    #[error("{0}")]
    Other(String),
}

type Result<T> = std::result::Result<T, PLCError>;

type TaskKey = (i64, bool, bool, u16);

impl From<ModbusError> for PLCError {
    fn from(err: ModbusError) -> Self {
        PLCError::Other(err.to_string())
    }
}

lazy_static! {
    pub static ref TASK_SCHEDULER: TaskScheduler = TaskScheduler::new();
}

pub async fn read_bool(client_id: i64, address: u16) -> Result<bool> {
    let values = MODBUS_MANAGER.read_coils(client_id, address, 1).await?;
    Ok(values[0])
}

pub async fn read_word(client_id: i64, address: u16, read_only: bool) -> Result<u16> {
    if read_only {
        let values = MODBUS_MANAGER
            .read_input_registers(client_id, address, 1)
            .await?;
        Ok(values[0])
    } else {
        let values = MODBUS_MANAGER
            .read_holding_registers(client_id, address, 1)
            .await?;
        Ok(values[0])
    }
}

pub async fn read_dword(client_id: i64, address: u16, read_only: bool) -> Result<u32> {
    let values = if read_only {
        MODBUS_MANAGER
            .read_input_registers(client_id, address, 2)
            .await?
    } else {
        MODBUS_MANAGER
            .read_holding_registers(client_id, address, 2)
            .await?
    };
    let value = (values[1] as u32) << 16 | (values[0] as u32);
    Ok(value)
}

pub async fn read_float(client_id: i64, address: u16, read_only: bool) -> Result<f32> {
    let values = if read_only {
        MODBUS_MANAGER
            .read_input_registers(client_id, address, 2)
            .await?
    } else {
        MODBUS_MANAGER
            .read_holding_registers(client_id, address, 2)
            .await?
    };
    let bits = (values[1] as u32) << 16 | (values[0] as u32);
    let value = f32::from_bits(bits);
    Ok(value)
}

pub async fn write_bool(client_id: i64, address: u16, value: bool) -> Result<()> {
    MODBUS_MANAGER
        .write_single_coil(client_id, address, value)
        .await?;
    Ok(())
}

pub async fn write_word(client_id: i64, address: u16, value: u16) -> Result<()> {
    MODBUS_MANAGER
        .write_single_register(client_id, address, value)
        .await?;
    Ok(())
}

pub async fn write_dword(client_id: i64, address: u16, value: u32) -> Result<()> {
    let low = (value & 0xFFFF) as u16;
    let high = ((value >> 16) & 0xFFFF) as u16;
    MODBUS_MANAGER
        .write_multiple_registers(client_id, address, &vec![low, high])
        .await?;
    Ok(())
}

pub async fn write_float(client_id: i64, address: u16, value: f32) -> Result<()> {
    let bits = value.to_bits();
    let low = (bits & 0xFFFF) as u16;
    let high = ((bits >> 16) & 0xFFFF) as u16;
    MODBUS_MANAGER
        .write_multiple_registers(client_id, address, &vec![low, high])
        .await?;
    Ok(())
}

fn generate_task_key(
    client_id: i64,
    address: u16,
    data_type: DataType,
    read_only: bool,
) -> TaskKey {
    if data_type == DataType::Bool {
        return (client_id, false, false, address);
    }
    (client_id, true, read_only, address)
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

pub struct TaskScheduler {
    tasks: Arc<Mutex<HashMap<TaskKey, TaskDefinition>>>,
    tasks_by_interval: Arc<Mutex<HashMap<u64, HashSet<TaskKey>>>>,
    timer_handle: Arc<Mutex<Option<JoinHandle<()>>>>,
    counter: Arc<Mutex<u64>>,
    running: Arc<Mutex<bool>>,
    execution_lock: Arc<Mutex<()>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct TaskDefinition {
    pub client_id: i64,
    pub address: u16,
    pub data_type: DataType,
    pub read_only: bool,
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
            execution_lock: Arc::new(Mutex::new(())),
        }
    }

    pub async fn register_task(
        &self,
        client_id: i64,
        interval_ms: u64,
        address: u16,
        data_type: u8,
        read_only: bool,
    ) -> Result<()> {
        // 验证间隔时间
        if interval_ms == 0 {
            return Err(PLCError::Other("间隔时间不能为零".to_string()));
        }

        let data_type = DataType::from(data_type);
        let task_key = generate_task_key(client_id, address, data_type, read_only);
        let task = TaskDefinition {
            client_id,
            address,
            data_type,
            read_only,
            interval_ms,
        };

        // 添加任务到任务列表
        let mut tasks = self.tasks.lock().await;
        tasks.insert(task_key, task);

        // 添加任务到间隔索引
        let mut tasks_by_interval = self.tasks_by_interval.lock().await;
        let group = tasks_by_interval
            .entry(interval_ms)
            .or_insert_with(HashSet::new);
        group.insert(task_key);

        Ok(())
    }

    pub async fn unregister_task(
        &self,
        client_id: i64,
        address: u16,
        data_type: u8,
        read_only: bool,
    ) -> Result<()> {
        let data_type = DataType::from(data_type);
        let task_key = generate_task_key(client_id, address, data_type, read_only);
        let mut tasks = self.tasks.lock().await;

        if let Some(task) = tasks.remove(&task_key) {
            let mut tasks_by_interval = self.tasks_by_interval.lock().await;
            if let Some(group) = tasks_by_interval.get_mut(&task.interval_ms) {
                group.remove(&task_key);
                if group.is_empty() {
                    tasks_by_interval.remove(&task.interval_ms);
                }
            }
            Ok(())
        } else {
            Err(PLCError::TaskNotFound { client_id, address })
        }
    }

    pub async fn start(&self) -> Result<()> {
        let mut running = self.running.lock().await;
        if *running {
            return Ok(());
        }

        let tasks = self.tasks.clone();
        let tasks_by_interval = self.tasks_by_interval.clone();
        let counter = self.counter.clone();
        let running_clone = self.running.clone();

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
                let tasks = tasks.lock().await;
                for task_id in tasks_to_execute {
                    if let Some(task) = tasks.get(&task_id) {
                        #[cfg(debug_assertions)]
                        println!(
                            "执行任务 - Client ID: {}, Address: {}, Interval: {}",
                            task.client_id, task.address, task.interval_ms
                        );

                        Self::execute_task(task, running_clone.clone()).await;
                    }
                }
            }
        });

        let mut timer_handle = self.timer_handle.lock().await;
        *timer_handle = Some(handle);
        *running = true;

        Ok(())
    }

    async fn execute_task(task: &TaskDefinition, running: Arc<Mutex<bool>>) {
        // 获取执行锁，确保同一时间只有一个任务在执行
        let _lock = TASK_SCHEDULER.execution_lock.lock().await;

        // 检查是否仍在运行
        if !*running.lock().await {
            return;
        }

        let client_id = task.client_id;
        let address = task.address;
        let read_only = task.read_only;

        match task.data_type {
            DataType::Bool => {
                if let Ok(value) = read_bool(client_id, address).await {
                    notify_bool(client_id, address, value);
                }
            }
            DataType::Word => {
                if let Ok(value) = read_word(client_id, address, read_only).await {
                    notify_word(client_id, address, read_only, value);
                }
            }
            DataType::Dword => {
                if let Ok(value) = read_dword(client_id, address, read_only).await {
                    notify_dword(client_id, address, read_only, value);
                }
            }
            DataType::Float => {
                if let Ok(value) = read_float(client_id, address, read_only).await {
                    notify_float(client_id, address, read_only, value);
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

pub async fn initialize() -> Result<()> {
    TASK_SCHEDULER.start().await
}
