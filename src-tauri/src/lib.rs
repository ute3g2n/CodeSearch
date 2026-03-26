// モジュール宣言
pub mod commands;
pub mod encoding;
pub mod errors;
pub mod indexer;
pub mod models;
pub mod services;
pub mod state;
pub mod storage;
pub mod watcher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // トレースログの初期化
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("Tauriアプリの起動に失敗しました");
}
