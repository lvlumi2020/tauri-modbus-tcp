use serde::Serialize;
use tauri::Emitter;

#[derive(Serialize, Clone)]
pub struct BoolValue {
    pub client_id: i64,
    pub address: u16,
    pub value: bool,
}

#[derive(Serialize, Clone)]
pub struct WordValue {
    pub client_id: i64,
    pub address: u16,
    pub value: u16,
}

#[derive(Serialize, Clone)]
pub struct DwordValue {
    pub client_id: i64,
    pub address: u16,
    pub value: u32,
}

#[derive(Serialize, Clone)]
pub struct FloatValue {
    pub client_id: i64,
    pub address: u16,
    pub value: f32,
}

pub fn notify_bool(app: tauri::AppHandle, client_id: i64, address: u16, value: bool) {
    #[cfg(debug_assertions)]
    println!(
        "发送布尔值更新 - Client Id: {}, Address: {}, Value: {}",
        client_id, address, value
    );

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

pub fn notify_word(app: tauri::AppHandle, client_id: i64, address: u16, value: u16) {
    #[cfg(debug_assertions)]
    println!(
        "发送字值更新 - Client Id: {}, Address: {}, Value: {}",
        client_id, address, value
    );

    if let Err(e) = app.emit(
        "plc-word-update",
        WordValue {
            client_id,
            address,
            value,
        },
    ) {
        eprintln!("Failed to emit word value: {}", e);
    }
}

pub fn notify_dword(app: tauri::AppHandle, client_id: i64, address: u16, value: u32) {
    #[cfg(debug_assertions)]
    println!(
        "发送双字值更新 - Client Id: {}, Address: {}, Value: {}",
        client_id, address, value
    );

    if let Err(e) = app.emit(
        "plc-dword-update",
        DwordValue {
            client_id,
            address,
            value,
        },
    ) {
        eprintln!("Failed to emit dword value: {}", e);
    }
}

pub fn notify_float(app: tauri::AppHandle, client_id: i64, address: u16, value: f32) {
    #[cfg(debug_assertions)]
    println!(
        "发送浮点值更新 - Client Id: {}, Address: {}, Value: {}",
        client_id, address, value
    );

    if let Err(e) = app.emit(
        "plc-float-update",
        FloatValue {
            client_id,
            address,
            value,
        },
    ) {
        eprintln!("Failed to emit float value: {}", e);
    }
}
