mod command;
mod modbus;
mod notice;
mod plc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 初始化 PLC 任务调度器
            let app_handle = app.handle();
            notice::set_app(app_handle.clone());

            tauri::async_runtime::block_on(async {
                if let Err(e) = plc::initialize().await {
                    eprintln!("任务调度器启动失败: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            command::modbus_create_connection,
            command::modbus_disconnect,
            command::modbus_connection_exists,
            command::modbus_read_holding_registers,
            command::modbus_write_single_register,
            command::modbus_write_multiple_registers,
            command::modbus_read_input_registers,
            command::modbus_read_coils,
            command::modbus_write_single_coil,
            command::plc_stop,
            command::plc_start,
            command::plc_register_task,
            command::plc_unregister_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
