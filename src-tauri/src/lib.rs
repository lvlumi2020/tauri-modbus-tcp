mod command;
mod modbus;
// mod modbus_tcp;
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
            command::modbus_create_tcp_connection,
            command::modbus_create_serial_connection,
            command::modbus_disconnect,
            command::modbus_connection_exists,
            command::plc_stop,
            command::plc_start,
            command::plc_register_task,
            command::plc_unregister_task,
            command::get_serial_ports,
            command::plc_read_bool,
            command::plc_read_word,
            command::plc_read_dword,
            command::plc_read_float,
            command::plc_write_bool,
            command::plc_write_word,
            command::plc_write_dword,
            command::plc_write_float,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
