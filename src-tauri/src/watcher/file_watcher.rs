/// ファイルシステム監視モジュール
/// notify-debouncer-mini による 500ms デバウンス + バッチ処理
/// 除外パターン適用・バイナリファイル除外を担う
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::Duration;

use crate::errors::AppError;

/// デバウンス時間（ミリ秒）
const DEBOUNCE_MS: u64 = 500;

/// ファイル変更イベント種別
#[derive(Debug, Clone, PartialEq)]
pub enum WatchEventKind {
    /// ファイルが作成された
    Created,
    /// ファイルが変更された
    Modified,
    /// ファイルが削除された
    Deleted,
}

/// ファイル変更イベント
#[derive(Debug, Clone)]
pub struct WatchEvent {
    /// イベント種別
    pub kind: WatchEventKind,
    /// 変更されたファイルの絶対パス
    pub path: PathBuf,
}

/// ファイル監視ハンドル
/// drop すると監視が停止する
pub struct FileWatcher {
    /// 内部監視オブジェクト（drop で停止）
    _debouncer: Box<dyn std::any::Any + Send>,
}

impl FileWatcher {
    /// ファイル監視を開始する
    ///
    /// - `workspace_root`: 監視ルートディレクトリ
    /// - `exclude_patterns`: 除外する glob パターン一覧
    /// - `tx`: イベント送信チャネル
    pub fn start(
        workspace_root: &Path,
        exclude_patterns: Vec<String>,
        tx: mpsc::Sender<WatchEvent>,
    ) -> Result<Self, AppError> {
        use notify_debouncer_mini::{
            new_debouncer,
            notify::RecursiveMode,
            DebouncedEventKind,
        };
        type NotifyError = notify_debouncer_mini::notify::Error;

        let patterns: Vec<glob::Pattern> = exclude_patterns
            .iter()
            .filter_map(|p| glob::Pattern::new(p).ok())
            .collect();

        let workspace_root_buf = workspace_root.to_path_buf();

        let mut debouncer = new_debouncer(
            Duration::from_millis(DEBOUNCE_MS),
            move |res: Result<Vec<notify_debouncer_mini::DebouncedEvent>, _>| {
                let events = match res {
                    Ok(ev) => ev,
                    Err(_) => return,
                };

                for event in events {
                    let path = &event.path;

                    // 除外判定
                    if should_ignore(path, &patterns, &workspace_root_buf) {
                        continue;
                    }

                    // ファイルのみ処理（ディレクトリイベントは無視）
                    // Delete の場合はパスが存在しないので種別で判断
                    let kind = match event.kind {
                        DebouncedEventKind::Any => {
                            // パスが存在しない → 削除
                            // パスが存在する → 作成 or 変更（詳細不明なため Modified とする）
                            if path.exists() {
                                if path.is_dir() {
                                    continue; // ディレクトリは無視
                                }
                                WatchEventKind::Modified
                            } else {
                                WatchEventKind::Deleted
                            }
                        }
                        DebouncedEventKind::AnyContinuous => continue,
                        _ => continue,
                    };

                    let _ = tx.send(WatchEvent {
                        kind,
                        path: path.clone(),
                    });
                }
            },
        )
        .map_err(|e: NotifyError| AppError::IndexError {
            message: format!("ファイル監視の初期化に失敗: {e}"),
        })?;

        debouncer
            .watcher()
            .watch(workspace_root, RecursiveMode::Recursive)
            .map_err(|e: NotifyError| AppError::IndexError {
                message: format!("ウォッチャーの登録に失敗: {e}"),
            })?;

        Ok(FileWatcher {
            _debouncer: Box::new(debouncer),
        })
    }
}

/// パスを無視すべきかどうか判定する
///
/// - 除外パターンにマッチするパスは無視
/// - バイナリファイル拡張子は無視
/// - 隠しファイル・隠しディレクトリは無視
pub fn should_ignore(path: &Path, patterns: &[glob::Pattern], workspace_root: &Path) -> bool {
    // ファイル名が取れない場合は無視
    let name = match path.file_name().and_then(|n| n.to_str()) {
        Some(n) => n,
        None => return true,
    };

    // 隠しファイル・ディレクトリ（ドット始まり）は無視
    if name.starts_with('.') {
        return true;
    }

    // パス中のコンポーネントが除外パターンにマッチすれば無視
    let rel = path.strip_prefix(workspace_root).unwrap_or(path);
    for component in rel.components() {
        let part = component.as_os_str().to_string_lossy();
        for pattern in patterns {
            if pattern.matches(&part) {
                return true;
            }
        }
    }

    // バイナリ拡張子は無視
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        if BINARY_EXTENSIONS.contains(&ext.to_lowercase().as_str()) {
            return true;
        }
    }

    false
}

/// 無視するバイナリ拡張子
const BINARY_EXTENSIONS: &[&str] = &[
    "exe", "dll", "so", "dylib", "bin", "obj", "o", "a", "lib",
    "zip", "tar", "gz", "bz2", "xz", "7z", "rar",
    "png", "jpg", "jpeg", "gif", "bmp", "ico", "webp",
    "mp3", "mp4", "wav", "avi", "mov", "mkv", "flac",
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
    "class", "pyc", "pyd",
    "ttf", "otf", "woff", "woff2",
    "db", "sqlite", "sqlite3",
];

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;
    use tempfile::TempDir;

    fn make_patterns(pats: &[&str]) -> Vec<glob::Pattern> {
        pats.iter()
            .filter_map(|p| glob::Pattern::new(p).ok())
            .collect()
    }

    // ===== should_ignore テスト =====

    #[test]
    fn 隠しファイルは無視されること() {
        let root = Path::new("/workspace");
        let patterns = make_patterns(&[]);
        assert!(should_ignore(
            Path::new("/workspace/.gitignore"),
            &patterns,
            root
        ));
    }

    #[test]
    fn 除外パターンにマッチするパスは無視されること() {
        let root = Path::new("/workspace");
        let patterns = make_patterns(&["node_modules", "target"]);
        assert!(should_ignore(
            Path::new("/workspace/node_modules/react/index.js"),
            &patterns,
            root
        ));
        assert!(should_ignore(
            Path::new("/workspace/target/debug/codesearch.exe"),
            &patterns,
            root
        ));
    }

    #[test]
    fn 通常のテキストファイルは無視されないこと() {
        let root = Path::new("/workspace");
        let patterns = make_patterns(&["node_modules"]);
        assert!(!should_ignore(
            Path::new("/workspace/src/main.rs"),
            &patterns,
            root
        ));
    }

    #[test]
    fn バイナリ拡張子は無視されること() {
        let root = Path::new("/workspace");
        let patterns = make_patterns(&[]);
        assert!(should_ignore(
            Path::new("/workspace/app.exe"),
            &patterns,
            root
        ));
        assert!(should_ignore(
            Path::new("/workspace/image.png"),
            &patterns,
            root
        ));
        assert!(should_ignore(
            Path::new("/workspace/font.ttf"),
            &patterns,
            root
        ));
    }

    #[test]
    fn globパターンのワイルドカードが動作すること() {
        let root = Path::new("/workspace");
        let patterns = make_patterns(&["*.log"]);
        assert!(should_ignore(
            Path::new("/workspace/app.log"),
            &patterns,
            root
        ));
        assert!(!should_ignore(
            Path::new("/workspace/app.rs"),
            &patterns,
            root
        ));
    }

    #[test]
    fn ファイル名が取れない場合は無視されること() {
        let root = Path::new("/workspace");
        let patterns = make_patterns(&[]);
        // ルートパスはファイル名なし
        assert!(should_ignore(Path::new("/"), &patterns, root));
    }

    // ===== FileWatcher 起動テスト =====

    #[test]
    fn ウォッチャーが起動できること() {
        let tmp = TempDir::new().unwrap();
        let (tx, _rx) = mpsc::channel();
        let result = FileWatcher::start(tmp.path(), vec![], tx);
        assert!(result.is_ok());
    }

    #[test]
    fn ファイル作成イベントが通知されること() {
        let tmp = TempDir::new().unwrap();
        let (tx, rx) = mpsc::channel();

        let _watcher = FileWatcher::start(tmp.path(), vec![], tx).unwrap();

        // watcher の初期化を待つ
        std::thread::sleep(Duration::from_millis(200));

        // ファイル作成
        std::fs::write(tmp.path().join("test.rs"), "fn main() {}").unwrap();

        // デバウンス(500ms) + マージン
        let event = rx.recv_timeout(Duration::from_secs(5));
        assert!(event.is_ok(), "ファイル作成イベントが届かなかった");
        let ev = event.unwrap();
        assert_eq!(ev.path.file_name().unwrap(), "test.rs");
    }

    #[test]
    fn デバウンスにより連続イベントがまとめられること() {
        let tmp = TempDir::new().unwrap();
        let (tx, rx) = mpsc::channel();

        let _watcher = FileWatcher::start(tmp.path(), vec![], tx).unwrap();

        // ウォッチャー初期化を待つ
        std::thread::sleep(Duration::from_millis(300));

        // 100ms 間隔で連続してファイルを更新する（デバウンス時間 500ms 以内）
        for i in 0..3 {
            std::fs::write(
                tmp.path().join("test.rs"),
                format!("fn main_{i}() {{}}"),
            )
            .unwrap();
            std::thread::sleep(Duration::from_millis(50));
        }

        // デバウンス(500ms) + マージン(1000ms) でイベントを受信
        let mut events = Vec::new();
        while let Ok(ev) = rx.recv_timeout(Duration::from_secs(2)) {
            events.push(ev);
        }

        // デバウンスにより、複数の書き込みが1〜少数のイベントにまとまること
        // （厳密な数は OS/FS によるため "最低1件" のみ検証）
        assert!(!events.is_empty(), "デバウンス後にイベントが届くこと");
        assert!(
            events.iter().all(|e| e.path.file_name().unwrap() == "test.rs"),
            "イベントのパスが test.rs であること"
        );
    }

    #[test]
    fn 除外パターンにマッチするファイルのイベントは通知されないこと() {
        let tmp = TempDir::new().unwrap();
        let (tx, rx) = mpsc::channel();

        let _watcher = FileWatcher::start(
            tmp.path(),
            vec!["*.log".to_string()],
            tx,
        )
        .unwrap();

        std::thread::sleep(Duration::from_millis(200));

        // 除外対象ファイルを作成
        std::fs::write(tmp.path().join("debug.log"), "log content").unwrap();

        // イベントは届かないはず（2秒待ってタイムアウト）
        let event = rx.recv_timeout(Duration::from_secs(2));
        assert!(
            event.is_err(),
            "除外対象ファイルのイベントが届いてしまった"
        );
    }
}
