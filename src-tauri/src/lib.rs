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

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // トレースログの初期化
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::file::get_file_tree,
            commands::file::read_file,
            commands::file::reveal_in_os_explorer,
            commands::file::get_relative_path,
            commands::file::search_files,
        ])
        .run(tauri::generate_context!())
        .expect("Tauriアプリの起動に失敗しました");
}
