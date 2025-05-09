use dns_lookup::lookup_host;
use lazy_static::lazy_static;
use regex::Regex;
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::net::{Ipv4Addr, SocketAddr};
use std::str::FromStr;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::Mutex;
use tokio_modbus::prelude::*;

#[derive(Error, Debug)]
pub enum ModbusError {
    #[error("无效的 IP 地址: {0}")]
    InvalidIp(String),

    #[error("串口不存在: {0}")]
    SerialPortNotFound(String),

    #[error("未找到 ID 为 {0} 的连接")]
    ClientNotFound(i64),

    #[error("其他错误: {0}")]
    Other(String),
}

// 结果类型别名
pub type Result<T> = std::result::Result<T, ModbusError>;

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

impl From<serialport::Error> for ModbusError {
    fn from(err: serialport::Error) -> Self {
        ModbusError::Other(err.to_string())
    }
}

lazy_static! {
    pub static ref MODBUS_MANAGER: ModbusManager = ModbusManager::new();
}

///是否IPV4地址
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

///是否域名
fn resolve_host(host: &str) -> Result<String> {
    let ips = lookup_host(host)?;
    for ip in ips {
        if ip.is_ipv4() {
            print!("域名解析成功: {} -> {}", host, ip);
            return Ok(ip.to_string());
        }
    }
    Err(ModbusError::InvalidIp(host.to_string()))
}

///获取IP地址
fn check_ip(input: &str) -> Result<String> {
    if is_ipv4(input) {
        Ok(input.to_string())
    } else {
        resolve_host(input)
    }
}

///生成客户端ID
fn generate_tcp_key(ip_str: &str, port: u16) -> Result<i64> {
    let ip_addr: Ipv4Addr = ip_str.parse()?;
    let ip_value = u32::from(ip_addr) as i64;
    Ok((ip_value << 16) | (port as i64))
}

///获取串口列表
pub fn get_all_serial_ports() -> Result<Vec<String>> {
    let ports = serialport::available_ports()?;
    let mut port_names = Vec::new();
    for port in ports {
        port_names.push(port.port_name.to_uppercase());
    }

    #[cfg(debug_assertions)]
    println!("获取串口列表: {:?}", port_names);

    Ok(port_names)
}

fn generate_serial_key(serial_port_str: &str) -> Result<i64> {
    let serial_port_str = serial_port_str.to_uppercase();

    let ports = get_all_serial_ports()?;

    if !ports.iter().any(|p| p.eq(&serial_port_str)) {
        return Err(ModbusError::SerialPortNotFound(serial_port_str.to_string()));
    }

    let mut hasher = DefaultHasher::new();
    serial_port_str.hash(&mut hasher);
    Ok(hasher.finish() as i64)
}

pub struct ModbusManager {
    clients: Mutex<HashMap<i64, Arc<Mutex<client::Context>>>>,
}

impl ModbusManager {
    pub fn new() -> Self {
        ModbusManager {
            clients: Mutex::new(HashMap::new()),
        }
    }

    // 创建新连接
    pub async fn create_tcp_connection(&self, ip_str: &str, port: u16) -> Result<i64> {
        let ip = check_ip(ip_str)?;
        let client_id = generate_tcp_key(&ip, port)?;
        // 检查连接是否已存在
        {
            let clients = self.clients.lock().await;
            if clients.contains_key(&client_id) {
                return Ok(client_id);
            }
        }
        let socket_addr = SocketAddr::from_str(&format!("{}:{}", ip_str, port))?;
        let client = tcp::connect_slave(socket_addr, Slave(1)).await?;
        let client = Arc::new(Mutex::new(client));
        let mut clients = self.clients.lock().await;
        clients.insert(client_id, client);
        Ok(client_id)
    }

    // 创建新连接
    pub async fn create_serial_connection(
        &self,
        serial_port_str: &str,
        baud_rate: u32,
        slave_id: u8,
    ) -> Result<i64> {
        let client_id = generate_serial_key(serial_port_str)?;

        #[cfg(debug_assertions)]
        println!("创建串口连接ID: {}", client_id);

        // 检查连接是否已存在
        {
            let clients = self.clients.lock().await;
            if clients.contains_key(&client_id) {
                return Ok(client_id);
            }
        }

        let builder = serialport::new(serial_port_str, baud_rate)
            .data_bits(serialport::DataBits::Eight)
            .flow_control(serialport::FlowControl::None)
            .parity(serialport::Parity::None)
            .stop_bits(serialport::StopBits::One)
            .timeout(std::time::Duration::from_secs(1));

        let transport = tokio_serial::SerialStream::open(&builder)?;

        // 创建 RTU 客户端
        let client = rtu::attach_slave(transport, Slave(slave_id));

        // 尝试进行一次简单操作以验证连接是否成功
        #[cfg(debug_assertions)]
        println!("正在验证串口连接: {}", serial_port_str);

        // 将客户端保存到 clients 中
        let client = Arc::new(Mutex::new(client));

        let mut clients = self.clients.lock().await;
        clients.insert(client_id, client.clone());

        // 验证连接是否可用
        let mut client_lock = client.lock().await;
        match client_lock.read_holding_registers(0, 1).await {
            Ok(_) => {
                #[cfg(debug_assertions)]
                println!("串口连接验证成功: {}", serial_port_str);
            }
            Err(e) => {
                // 连接失败，从 clients 中移除
                clients.remove(&client_id);
                return Err(ModbusError::Other(format!("串口连接验证失败: {}", e)));
            }
        }

        Ok(client_id)
    }

    // 断开指定 ID 的连接
    pub async fn disconnect(&self, client_id: i64) -> Result<()> {
        let mut clients = self.clients.lock().await;

        let client = clients
            .remove(&client_id)
            .ok_or_else(|| ModbusError::ClientNotFound(client_id))?;
        let mut client = client.lock().await;
        client.disconnect().await?;

        #[cfg(debug_assertions)]
        println!("断开连接: {}", client_id);

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
        let client = clients
            .get(&client_id)
            .ok_or_else(|| ModbusError::ClientNotFound(client_id))?;
        let mut client = client.lock().await;
        let value = client.read_holding_registers(address, quantity).await?;
        Ok(value)
    }

    // 写入单个保持寄存器
    pub async fn write_single_register(
        &self,
        client_id: i64,
        address: u16,
        value: u16,
    ) -> Result<()> {
        let clients = self.clients.lock().await;
        let client = clients
            .get(&client_id)
            .ok_or_else(|| ModbusError::ClientNotFound(client_id))?;
        let mut client = client.lock().await;
        client.write_single_register(address, value).await?;
        Ok(())
    }

    // 写入多个保持寄存器
    pub async fn write_multiple_registers(
        &self,
        client_id: i64,
        address: u16,
        values: &[u16],
    ) -> Result<()> {
        let clients = self.clients.lock().await;
        let client = clients
            .get(&client_id)
            .ok_or_else(|| ModbusError::ClientNotFound(client_id))?;
        let mut client = client.lock().await;
        client.write_multiple_registers(address, values).await?;
        Ok(())
    }

    // 读取输入寄存器
    pub async fn read_input_registers(
        &self,
        client_id: i64,
        address: u16,
        quantity: u16,
    ) -> Result<Vec<u16>> {
        let clients = self.clients.lock().await;
        let client = clients
            .get(&client_id)
            .ok_or_else(|| ModbusError::ClientNotFound(client_id))?;
        let mut client = client.lock().await;
        let vlaue = client.read_input_registers(address, quantity).await?;
        Ok(vlaue)
    }

    // 读取线圈状态
    pub async fn read_coils(
        &self,
        client_id: i64,
        address: u16,
        quantity: u16,
    ) -> Result<Vec<bool>> {
        let clients = self.clients.lock().await;
        let client = clients
            .get(&client_id)
            .ok_or_else(|| ModbusError::ClientNotFound(client_id))?;
        let mut client = client.lock().await;
        let value = client.read_coils(address, quantity).await?;
        Ok(value)
    }

    // 写入单个线圈
    pub async fn write_single_coil(&self, client_id: i64, address: u16, value: bool) -> Result<()> {
        let clients = self.clients.lock().await;
        let client = clients
            .get(&client_id)
            .ok_or_else(|| ModbusError::ClientNotFound(client_id))?;
        let mut client = client.lock().await;
        client.write_single_coil(address, value).await?;
        Ok(())
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
        if let Ok(rt) = tokio::runtime::Runtime::new() {
            rt.block_on(async {
                let client_ids = self.get_all_connections().await;
                for client_id in client_ids {
                    let _ = self.disconnect(client_id).await;
                }
            });
        }
    }
}
