use serde::Serialize;
use std::sync::Mutex;
use tauri::Emitter;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BoolValue {
    pub client_id: i64,
    pub address: u16,
    pub value: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WordValue {
    pub client_id: i64,
    pub address: u16,
    pub read_only: bool,
    pub value: u16,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DwordValue {
    pub client_id: i64,
    pub address: u16,
    pub read_only: bool,
    pub value: u32,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FloatValue {
    pub client_id: i64,
    pub address: u16,
    pub read_only: bool,
    pub value: f32,
}

// 添加全局静态变量
static APP: Mutex<Option<tauri::AppHandle>> = Mutex::new(None);

// 添加设置方法
pub fn set_app(app: tauri::AppHandle) {
    let mut app_handle = APP.lock().unwrap();
    *app_handle = Some(app);
}

// 获取 app handle 的辅助函数
fn get_app() -> tauri::AppHandle {
    APP.lock()
        .unwrap()
        .clone()
        .expect("App handle not initialized")
}

#[tauri::command]
pub fn notify_bool(client_id: i64, address: u16, value: bool) {
    #[cfg(debug_assertions)]
    println!(
        "发送布尔值更新 - Client Id: {}, Address: {}, Value: {}",
        client_id, address, value
    );

    let app = get_app();

    if let Err(e) = app.emit(
        "plc-bool-update",
        BoolValue {
            client_id,
            address,
            value,
        },
    ) {
        eprintln!("Failed to emit bool value: {}", e);
    }
}

#[tauri::command]
pub fn notify_word(client_id: i64, address: u16, read_only: bool, value: u16) {
    #[cfg(debug_assertions)]
    println!(
        "发送字值更新 - Client Id: {}, Address: {}, Value: {}",
        client_id, address, value
    );

    let app = get_app();

    if let Err(e) = app.emit(
        "plc-word-update",
        WordValue {
            client_id,
            address,
            read_only,
            value,
        },
    ) {
        eprintln!("Failed to emit word value: {}", e);
    }
}

#[tauri::command]
pub fn notify_dword(client_id: i64, address: u16, read_only: bool, value: u32) {
    #[cfg(debug_assertions)]
    println!(
        "发送双字值更新 - Client Id: {}, Address: {}, Value: {}",
        client_id, address, value
    );

    let app = get_app();

    if let Err(e) = app.emit(
        "plc-dword-update",
        DwordValue {
            client_id,
            address,
            read_only,
            value,
        },
    ) {
        eprintln!("Failed to emit dword value: {}", e);
    }
}

#[tauri::command]
pub fn notify_float(client_id: i64, address: u16, read_only: bool, value: f32) {
    #[cfg(debug_assertions)]
    println!(
        "发送浮点值更新 - Client Id: {}, Address: {}, Value: {}",
        client_id, address, value
    );

    let app = get_app();

    if let Err(e) = app.emit(
        "plc-float-update",
        FloatValue {
            client_id,
            address,
            read_only,
            value,
        },
    ) {
        eprintln!("Failed to emit float value: {}", e);
    }
}
