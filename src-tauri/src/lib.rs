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

    // データディレクトリ: exe 実行ディレクトリ配下の data/（ポータブル運用）
    // zip 展開後すぐに使用可能、インストール不要
    let data_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("data");
    std::fs::create_dir_all(&data_dir).expect("データディレクトリの作成に失敗しました");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::new(data_dir))
        .invoke_handler(tauri::generate_handler![
            commands::file::get_file_tree,
            commands::file::read_file,
            commands::file::reveal_in_os_explorer,
            commands::file::get_relative_path,
            commands::file::search_files,
            commands::search::search_fulltext,
            commands::search::build_index,
            commands::search::start_file_watcher,
            commands::search::get_index_status,
            commands::search::get_search_history,
            commands::search::clear_search_history,
            commands::bookmark::add_bookmark,
            commands::bookmark::remove_bookmark,
            commands::bookmark::get_bookmarks,
            commands::bookmark::clear_bookmarks_by_color,
            commands::workspace::select_directory,
            commands::workspace::open_workspace,
            commands::workspace::close_workspace,
            commands::workspace::list_recent_workspaces,
            commands::config::get_config,
            commands::config::save_config,
        ])
        .run(tauri::generate_context!())
        .expect("Tauriアプリの起動に失敗しました");
}
