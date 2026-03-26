use std::sync::RwLock;

/// ワークスペース管理サービス（スタブ）
/// 後続フェーズで実装する
pub struct WorkspaceService {
    /// 現在開いているワークスペースのパス
    current_path: RwLock<Option<String>>,
}

impl WorkspaceService {
    pub fn new() -> Self {
        Self {
            current_path: RwLock::new(None),
        }
    }

    /// 現在のワークスペースパスを返す
    pub fn current_path(&self) -> Option<String> {
        self.current_path.read().unwrap().clone()
    }

    /// ワークスペースパスを設定する
    pub fn set_current_path(&self, path: Option<String>) {
        *self.current_path.write().unwrap() = path;
    }
}
