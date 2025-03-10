use crate::modbus::MODBUS_MANAGER;
use crate::plc::TASK_SCHEDULER;

#[tauri::command]
pub async fn modbus_create_connection(ip: String, port: u16) -> Result<i64, String> {
    #[cfg(debug_assertions)]
    println!("创建连接 - IP: {}, Port: {}", ip, port);
    MODBUS_MANAGER
        .create_connection(ip, port)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn modbus_disconnect(client_id: i64) -> Result<(), String> {
    #[cfg(debug_assertions)]
    println!("断开连接 - Client ID: {}", client_id);
    MODBUS_MANAGER
        .disconnect(client_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn modbus_connection_exists(client_id: i64) -> Result<bool, String> {
    #[cfg(debug_assertions)]
    println!("检查连接 - Client ID: {}", client_id);
    Ok(MODBUS_MANAGER.connection_exists(client_id).await)
}

#[tauri::command]
pub async fn modbus_read_holding_registers(
    client_id: i64,
    address: u16,
    quantity: u16,
) -> Result<Vec<u16>, String> {
    #[cfg(debug_assertions)]
    println!(
        "读取保持寄存器 - Client ID: {}, Address: {}, Quantity: {}",
        client_id, address, quantity
    );
    MODBUS_MANAGER
        .read_holding_registers(client_id, address, quantity)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn modbus_write_single_register(
    client_id: i64,
    address: u16,
    value: u16,
) -> Result<(), String> {
    #[cfg(debug_assertions)]
    println!(
        "写入单个寄存器 - Client ID: {}, Address: {}, Value: {}",
        client_id, address, value
    );
    MODBUS_MANAGER
        .write_single_register(client_id, address, value)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn modbus_write_multiple_registers(
    client_id: i64,
    address: u16,
    values: Vec<u16>,
) -> Result<(), String> {
    #[cfg(debug_assertions)]
    println!(
        "写入多个寄存器 - Client ID: {}, Address: {}, Values: {:?}",
        client_id, address, values
    );
    MODBUS_MANAGER
        .write_multiple_registers(client_id, address, &values)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn modbus_read_input_registers(
    client_id: i64,
    address: u16,
    quantity: u16,
) -> Result<Vec<u16>, String> {
    #[cfg(debug_assertions)]
    println!(
        "读取输入寄存器 - Client ID: {}, Address: {}, Quantity: {}",
        client_id, address, quantity
    );
    MODBUS_MANAGER
        .read_input_registers(client_id, address, quantity)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn modbus_read_coils(
    client_id: i64,
    address: u16,
    quantity: u16,
) -> Result<Vec<bool>, String> {
    #[cfg(debug_assertions)]
    println!(
        "读取线圈 - Client ID: {}, Address: {}, Quantity: {}",
        client_id, address, quantity
    );
    MODBUS_MANAGER
        .read_coils(client_id, address, quantity)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn modbus_write_single_coil(
    client_id: i64,
    address: u16,
    value: bool,
) -> Result<(), String> {
    #[cfg(debug_assertions)]
    println!(
        "写入单个线圈 - Client ID: {}, Address: {}, Value: {}",
        client_id, address, value
    );
    MODBUS_MANAGER
        .write_single_coil(client_id, address, value)
        .await
        .map_err(|e| e.to_string())
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
    client_id: i64,
    interval_ms: u64,
    address: u16,
    data_type: u8,
) -> Result<(), String> {
    #[cfg(debug_assertions)]
    println!(
        "注册 PLC 任务 - Client ID: {}, Interval: {}ms, Address: {}, Data Type: {}",
        client_id, interval_ms, address, data_type
    );
    TASK_SCHEDULER
        .register_task(client_id, interval_ms, address, data_type)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plc_unregister_task(client_id: i64, address: u16) -> Result<(), String> {
    #[cfg(debug_assertions)]
    println!(
        "注销 PLC 任务 - client_id: {}, address: {}",
        client_id, address
    );
    TASK_SCHEDULER
        .unregister_task(client_id, address)
        .await
        .map_err(|e| e.to_string())
}
