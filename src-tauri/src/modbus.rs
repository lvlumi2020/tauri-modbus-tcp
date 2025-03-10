use dns_lookup::lookup_host;
use lazy_static::lazy_static;
use regex::Regex;
use std::collections::HashMap;
use std::net::{Ipv4Addr, SocketAddr};
use std::str::FromStr;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::Mutex;
use tokio_modbus::prelude::*;

// 定义错误类型
#[derive(Error, Debug)]
pub enum ModbusError {
    #[error("无效的 IP 地址: {0}")]
    InvalidIp(String),

    #[error("连接失败: {0}")]
    ConnectionFailed(String),

    #[error("未连接到 Modbus 服务器")]
    NotConnected,

    #[error("未找到 ID 为 {0} 的连接")]
    ClientNotFound(i64),

    #[error("其他错误: {0}")]
    Other(String),
}

// 实现从其他错误类型转换
impl From<std::io::Error> for ModbusError {
    fn from(err: std::io::Error) -> Self {
        ModbusError::Other(err.to_string())
    }
}

impl From<std::net::AddrParseError> for ModbusError {
    fn from(err: std::net::AddrParseError) -> Self {
        ModbusError::InvalidIp(err.to_string())
    }
}

// 结果类型别名
type Result<T> = std::result::Result<T, ModbusError>;

fn is_ipv4(ip: &str) -> bool {
    let re = Regex::new(r"^(\d{1,3}\.){3}\d{1,3}$").unwrap();
    if !re.is_match(ip) {
        return false;
    }
    // 验证每个数字是否在 0-255 范围内
    ip.split('.')
        .map(|num| num.parse::<u8>())
        .all(|num| num.is_ok())
}

fn resolve_host(host: &str) -> Option<String> {
    match lookup_host(host) {
        Ok(ips) => {
            // 查找第一个 IPv4 地址
            for ip in ips {
                if ip.is_ipv4() {
                    return Some(ip.to_string());
                }
            }
            None
        }
        Err(_) => None,
    }
}

fn get_ip(input: &str) -> Option<String> {
    if is_ipv4(input) {
        Some(input.to_string())
    } else {
        resolve_host(input)
    }
}

lazy_static! {
    pub static ref MODBUS_MANAGER: ModbusManager = ModbusManager::new();
}

// Modbus 客户端包装器
pub struct ModbusClientWrapper {
    client: Option<client::Context>,
    ip: String,
    port: u16,
}

impl ModbusClientWrapper {
    pub fn new(ip: String, port: u16) -> Self {
        ModbusClientWrapper {
            client: None,
            ip,
            port,
        }
    }

    pub async fn connect(&mut self) -> Result<()> {
        let socket_addr = SocketAddr::from_str(&format!("{}:{}", self.ip, self.port))
            .map_err(|e| ModbusError::ConnectionFailed(e.to_string()))?;

        let tcp = tcp::connect_slave(socket_addr, Slave(0x01))
            .await
            .map_err(|e| ModbusError::ConnectionFailed(e.to_string()))?;

        self.client = Some(tcp);
        Ok(())
    }

    pub fn disconnect(&mut self) {
        self.client = None;
    }

    pub async fn read_holding_registers(
        &mut self,
        address: u16,
        quantity: u16,
    ) -> Result<Vec<u16>> {
        if let Some(client) = &mut self.client {
            let values = client.read_holding_registers(address, quantity).await?;
            Ok(values)
        } else {
            Err(ModbusError::NotConnected)
        }
    }

    pub async fn write_single_register(&mut self, address: u16, value: u16) -> Result<()> {
        if let Some(client) = &mut self.client {
            client.write_single_register(address, value).await?;
            Ok(())
        } else {
            Err(ModbusError::NotConnected)
        }
    }

    pub async fn write_multiple_registers(&mut self, address: u16, values: &[u16]) -> Result<()> {
        if let Some(client) = &mut self.client {
            client.write_multiple_registers(address, values).await?;
            Ok(())
        } else {
            Err(ModbusError::NotConnected)
        }
    }

    pub async fn read_input_registers(&mut self, address: u16, quantity: u16) -> Result<Vec<u16>> {
        if let Some(client) = &mut self.client {
            let values = client.read_input_registers(address, quantity).await?;
            Ok(values)
        } else {
            Err(ModbusError::NotConnected)
        }
    }

    pub async fn read_coils(&mut self, address: u16, quantity: u16) -> Result<Vec<bool>> {
        if let Some(client) = &mut self.client {
            let values = client.read_coils(address, quantity).await?;
            Ok(values)
        } else {
            Err(ModbusError::NotConnected)
        }
    }

    pub async fn write_single_coil(&mut self, address: u16, value: bool) -> Result<()> {
        if let Some(client) = &mut self.client {
            client.write_single_coil(address, value).await?;
            Ok(())
        } else {
            Err(ModbusError::NotConnected)
        }
    }
}

// Modbus 客户端管理器
pub struct ModbusManager {
    clients: Mutex<HashMap<i64, Arc<Mutex<ModbusClientWrapper>>>>,
}

impl ModbusManager {
    pub fn new() -> Self {
        ModbusManager {
            clients: Mutex::new(HashMap::new()),
        }
    }

    pub async fn create_connection(&self, ip_str: String, port: u16) -> Result<i64> {
        let ip = get_ip(&ip_str).ok_or_else(|| ModbusError::InvalidIp(ip_str.clone()))?;
        let client_id = Self::generate_key(&ip, port)?;

        // 检查连接是否已存在
        {
            let clients = self.clients.lock().await;
            if clients.contains_key(&client_id) {
                return Ok(client_id);
            }
        }

        // 创建新连接
        let mut client = ModbusClientWrapper::new(ip.clone(), port);
        client.connect().await?;

        let client = Arc::new(Mutex::new(client));
        let mut clients = self.clients.lock().await;
        clients.insert(client_id, client);

        Ok(client_id)
    }

    fn generate_key(ip_str: &str, port: u16) -> Result<i64> {
        let ip_addr: Ipv4Addr = ip_str.parse()?;
        let ip_value = u32::from(ip_addr) as i64;
        Ok((ip_value << 16) | (port as i64))
    }

    // 断开指定 ID 的连接
    pub async fn disconnect(&self, client_id: i64) -> Result<()> {
        let mut clients = self.clients.lock().await;

        if let Some(client) = clients.get(&client_id) {
            // 先断开连接
            let mut client = client.lock().await;
            client.disconnect();
            drop(client); // 明确释放锁
        } else {
            return Err(ModbusError::ClientNotFound(client_id));
        }
        // 从管理器中移除
        clients.remove(&client_id);
        Ok(())
    }

    // 读取保持寄存器
    pub async fn read_holding_registers(
        &self,
        client_id: i64,
        address: u16,
        quantity: u16,
    ) -> Result<Vec<u16>> {
        let clients = self.clients.lock().await;

        if let Some(client) = clients.get(&client_id) {
            let mut client = client.lock().await;
            client.read_holding_registers(address, quantity).await
        } else {
            Err(ModbusError::ClientNotFound(client_id))
        }
    }

    // 写入单个保持寄存器
    pub async fn write_single_register(
        &self,
        client_id: i64,
        address: u16,
        value: u16,
    ) -> Result<()> {
        let clients = self.clients.lock().await;

        if let Some(client) = clients.get(&client_id) {
            let mut client = client.lock().await;
            client.write_single_register(address, value).await
        } else {
            Err(ModbusError::ClientNotFound(client_id))
        }
    }

    // 写入多个保持寄存器
    pub async fn write_multiple_registers(
        &self,
        client_id: i64,
        address: u16,
        values: &[u16],
    ) -> Result<()> {
        let clients = self.clients.lock().await;

        if let Some(client) = clients.get(&client_id) {
            let mut client = client.lock().await;
            client.write_multiple_registers(address, values).await
        } else {
            Err(ModbusError::ClientNotFound(client_id))
        }
    }

    // 读取输入寄存器
    pub async fn read_input_registers(
        &self,
        client_id: i64,
        address: u16,
        quantity: u16,
    ) -> Result<Vec<u16>> {
        let clients = self.clients.lock().await;

        if let Some(client) = clients.get(&client_id) {
            let mut client = client.lock().await;
            client.read_input_registers(address, quantity).await
        } else {
            Err(ModbusError::ClientNotFound(client_id))
        }
    }

    // 读取线圈状态
    pub async fn read_coils(
        &self,
        client_id: i64,
        address: u16,
        quantity: u16,
    ) -> Result<Vec<bool>> {
        let clients = self.clients.lock().await;

        if let Some(client) = clients.get(&client_id) {
            let mut client = client.lock().await;
            client.read_coils(address, quantity).await
        } else {
            Err(ModbusError::ClientNotFound(client_id))
        }
    }

    // 写入单个线圈
    pub async fn write_single_coil(&self, client_id: i64, address: u16, value: bool) -> Result<()> {
        let clients = self.clients.lock().await;

        if let Some(client) = clients.get(&client_id) {
            let mut client = client.lock().await;
            client.write_single_coil(address, value).await
        } else {
            Err(ModbusError::ClientNotFound(client_id))
        }
    }

    // 获取所有连接的 ID
    pub async fn get_all_connections(&self) -> Vec<i64> {
        let clients = self.clients.lock().await;
        clients.keys().cloned().collect()
    }

    // 检查连接是否存在
    pub async fn connection_exists(&self, client_id: i64) -> bool {
        let clients = self.clients.lock().await;
        clients.contains_key(&client_id)
    }
}

impl Drop for ModbusManager {
    fn drop(&mut self) {
        // 使用 tokio 的 runtime 来执行异步断开连接操作
        if let Ok(rt) = tokio::runtime::Runtime::new() {
            rt.block_on(async {
                // 获取所有连接的 ID
                let client_ids = self.get_all_connections().await;

                // 断开所有连接
                for client_id in client_ids {
                    let _ = self.disconnect(client_id).await;
                }
            });
        }
    }
}

impl Drop for ModbusClientWrapper {
    fn drop(&mut self) {
        // 确保连接被断开
        self.disconnect();
    }
}
