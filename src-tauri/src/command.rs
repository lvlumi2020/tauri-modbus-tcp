use crate::modbus::get_all_serial_ports;
use crate::modbus::MODBUS_MANAGER;
use crate::plc::TASK_SCHEDULER;

#[tauri::command]
pub async fn get_serial_ports() -> Result<Vec<String>, String> {
    #[cfg(debug_assertions)]
    println!("获取串口列表");

    get_all_serial_ports().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn modbus_create_tcp_connection(ip: String, port: u16) -> Result<String, String> {
    #[cfg(debug_assertions)]
    println!("创建连接 - IP: {}, Port: {}", ip, port);
    let id = MODBUS_MANAGER
        .create_tcp_connection(&ip, port)
        .await
        .map_err(|e| e.to_string())?;
    Ok(id.to_string())
}

#[tauri::command]
pub async fn modbus_create_serial_connection(
    serial_port: String,
    baud_rate: u32,
    slave_id: u8,
) -> Result<String, String> {
    #[cfg(debug_assertions)]
    println!(
        "创建连接 - 串口: {}, 波特率: {}, 从机ID: {}",
        serial_port, baud_rate, slave_id
    );
    let id = MODBUS_MANAGER
        .create_serial_connection(&serial_port, baud_rate, slave_id)
        .await
        .map_err(|e| e.to_string())?;
    Ok(id.to_string())
}

#[tauri::command]
pub async fn modbus_disconnect(client_id: String) -> Result<(), String> {
    #[cfg(debug_assertions)]
    println!("断开连接 - Client ID: {}", client_id);
    let client_id = to_i64(&client_id)?;
    MODBUS_MANAGER
        .disconnect(client_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn modbus_connection_exists(client_id: String) -> Result<bool, String> {
    #[cfg(debug_assertions)]
    println!("检查连接 - Client ID: {}", client_id);
    let client_id = to_i64(&client_id)?;
    Ok(MODBUS_MANAGER.connection_exists(client_id).await)
}

#[tauri::command]
pub async fn plc_start() -> Result<(), String> {
    #[cfg(debug_assertions)]
    println!("启动 PLC 任务调度器");
    TASK_SCHEDULER.start().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plc_stop() -> Result<(), String> {
    #[cfg(debug_assertions)]
    println!("停止 PLC 任务调度器");
    TASK_SCHEDULER.stop().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plc_register_task(
    client_id: String,
    interval_ms: String,
    address: u16,
    data_type: u8,
    read_only: bool,
) -> Result<(), String> {
    #[cfg(debug_assertions)]
    println!(
        "注册 PLC 任务 - Client ID: {}, Interval: {}ms, Address: {}, Data Type: {}, Read Only: {}",
        client_id, interval_ms, address, data_type, read_only
    );
    let client_id = to_i64(&client_id)?;
    let interval_ms = to_u64(&interval_ms)?;
    TASK_SCHEDULER
        .register_task(client_id, interval_ms, address, data_type, read_only)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plc_unregister_task(
    client_id: String,
    address: u16,
    data_type: u8,
    read_only: bool,
) -> Result<(), String> {
    #[cfg(debug_assertions)]
    println!(
        "注销 PLC 任务 - client_id: {}, address: {}",
        client_id, address
    );
    let client_id = to_i64(&client_id)?;
    TASK_SCHEDULER
        .unregister_task(client_id, address, data_type, read_only)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plc_read_bool(client_id: String, address: u16) -> Result<bool, String> {
    #[cfg(debug_assertions)]
    println!(
        "读取布尔值 - Client ID: {}, Address: {}",
        client_id, address
    );
    let client_id = to_i64(&client_id)?;
    crate::plc::read_bool(client_id, address)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plc_read_word(
    client_id: String,
    address: u16,
    read_only: bool,
) -> Result<u16, String> {
    #[cfg(debug_assertions)]
    println!(
        "读取字 - Client ID: {}, Address: {}, ReadOnly: {}",
        client_id, address, read_only
    );
    let client_id = to_i64(&client_id)?;
    crate::plc::read_word(client_id, address, read_only)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plc_read_dword(
    client_id: String,
    address: u16,
    read_only: bool,
) -> Result<u32, String> {
    #[cfg(debug_assertions)]
    println!(
        "读取双字 - Client ID: {}, Address: {}, ReadOnly: {}",
        client_id, address, read_only
    );
    let client_id = to_i64(&client_id)?;
    crate::plc::read_dword(client_id, address, read_only)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plc_read_float(
    client_id: String,
    address: u16,
    read_only: bool,
) -> Result<f32, String> {
    #[cfg(debug_assertions)]
    println!(
        "读取浮点数 - Client ID: {}, Address: {}, ReadOnly: {}",
        client_id, address, read_only
    );
    let client_id = to_i64(&client_id)?;
    crate::plc::read_float(client_id, address, read_only)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plc_write_bool(client_id: String, address: u16, value: bool) -> Result<(), String> {
    #[cfg(debug_assertions)]
    println!(
        "写入布尔值 - Client ID: {}, Address: {}, Value: {}",
        client_id, address, value
    );
    let client_id = to_i64(&client_id)?;
    crate::plc::write_bool(client_id, address, value)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plc_write_word(client_id: String, address: u16, value: u16) -> Result<(), String> {
    #[cfg(debug_assertions)]
    println!(
        "写入字 - Client ID: {}, Address: {}, Value: {}",
        client_id, address, value
    );
    let client_id = to_i64(&client_id)?;
    crate::plc::write_word(client_id, address, value)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plc_write_dword(client_id: String, address: u16, value: u32) -> Result<(), String> {
    #[cfg(debug_assertions)]
    println!(
        "写入双字 - Client ID: {}, Address: {}, Value: {}",
        client_id, address, value
    );
    let client_id = to_i64(&client_id)?;
    crate::plc::write_dword(client_id, address, value)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plc_write_float(client_id: String, address: u16, value: f32) -> Result<(), String> {
    #[cfg(debug_assertions)]
    println!(
        "写入浮点数 - Client ID: {}, Address: {}, Value: {}",
        client_id, address, value
    );
    let client_id = to_i64(&client_id)?;
    crate::plc::write_float(client_id, address, value)
        .await
        .map_err(|e| e.to_string())
}

fn to_i64(client_id: &str) -> Result<i64, String> {
    client_id
        .parse()
        .map_err(|e| format!("无效的客户端ID: {}", e))
}

fn to_u64(interval_ms: &str) -> Result<u64, String> {
    interval_ms
        .parse()
        .map_err(|e| format!("无效的间隔时间: {}", e))
}
