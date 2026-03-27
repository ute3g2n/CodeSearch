/// ワークスペース管理サービス
/// workspaces.json の永続化とライフサイクル管理を担う
use std::path::{Path, PathBuf};
use std::sync::RwLock;

use chrono::Utc;
use sha2::{Digest, Sha256};

use crate::errors::AppError;
use crate::models::workspace::Workspace;

/// ワークスペース管理サービス
pub struct WorkspaceService {
    /// データディレクトリ（workspaces.json の保存先）
    data_dir: PathBuf,
    /// メモリ上のワークスペース一覧
    workspaces: RwLock<Vec<Workspace>>,
    /// 現在開いているワークスペースの ID
    current_id: RwLock<Option<String>>,
}

impl WorkspaceService {
    /// データディレクトリを指定して WorkspaceService を生成する
    ///
    /// 既存の workspaces.json があれば読み込む
    pub fn new(data_dir: &Path) -> Self {
        let workspaces = Self::load_from_file(data_dir);
        WorkspaceService {
            data_dir: data_dir.to_path_buf(),
            workspaces: RwLock::new(workspaces),
            current_id: RwLock::new(None),
        }
    }

    /// ワークスペースを開く
    ///
    /// - 初回: 新規エントリを追加して保存
    /// - 既存: `last_opened_at` を更新して保存
    /// - `current_id` を当該ワークスペースの ID に設定する
    pub fn open(&self, path: &str) -> Result<Workspace, AppError> {
        let id = Self::workspace_id(path);
        let name = Path::new(path)
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned();

        let mut workspaces = self.workspaces.write().unwrap();

        if let Some(ws) = workspaces.iter_mut().find(|w| w.id == id) {
            // 既存エントリの更新
            ws.last_opened_at = Utc::now();
        } else {
            // 新規エントリの追加
            workspaces.push(Workspace {
                id: id.clone(),
                path: path.to_string(),
                name,
                last_opened_at: Utc::now(),
            });
        }

        // 最後に開いた順に並び替え
        workspaces.sort_by(|a, b| b.last_opened_at.cmp(&a.last_opened_at));

        let ws = workspaces.iter().find(|w| w.id == id).cloned().unwrap();

        drop(workspaces);

        self.save_to_file()?;
        *self.current_id.write().unwrap() = Some(id);

        Ok(ws)
    }

    /// 現在のワークスペースを閉じる
    pub fn close(&self) -> Result<(), AppError> {
        *self.current_id.write().unwrap() = None;
        Ok(())
    }

    /// 最近開いたワークスペース一覧を返す（最大20件）
    pub fn list(&self) -> Vec<Workspace> {
        let workspaces = self.workspaces.read().unwrap();
        workspaces.iter().take(20).cloned().collect()
    }

    /// 現在開いているワークスペースを返す
    pub fn current(&self) -> Option<Workspace> {
        let current_id = self.current_id.read().unwrap().clone()?;
        let workspaces = self.workspaces.read().unwrap();
        workspaces.iter().find(|w| w.id == current_id).cloned()
    }

    /// 現在のワークスペースパスを返す（後方互換用）
    pub fn current_path(&self) -> Option<String> {
        self.current().map(|w| w.path)
    }

    /// ワークスペースの一意IDを生成する
    ///
    /// パスの SHA-256 ハッシュの先頭16文字を使用する
    pub fn workspace_id(path: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(path.as_bytes());
        let hash = hasher.finalize();
        hex::encode(&hash[..8]) // 先頭8バイト = 16文字の hex 文字列
    }

    /// workspaces.json からワークスペース一覧を読み込む
    fn load_from_file(data_dir: &Path) -> Vec<Workspace> {
        let path = data_dir.join("workspaces.json");
        let Ok(content) = std::fs::read_to_string(&path) else {
            return Vec::new();
        };
        serde_json::from_str::<Vec<Workspace>>(&content).unwrap_or_default()
    }

    /// workspaces.json にワークスペース一覧を書き込む
    fn save_to_file(&self) -> Result<(), AppError> {
        let workspaces = self.workspaces.read().unwrap();
        let path = self.data_dir.join("workspaces.json");
        let content = serde_json::to_string_pretty(&*workspaces)
            .map_err(|e| AppError::IoError(std::io::Error::new(std::io::ErrorKind::Other, e)))?;
        std::fs::write(&path, content)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup() -> (TempDir, WorkspaceService) {
        let tmp = TempDir::new().unwrap();
        let svc = WorkspaceService::new(tmp.path());
        (tmp, svc)
    }

    #[test]
    fn ワークスペースを開けること() {
        let (_tmp, svc) = setup();
        let ws = svc.open("/home/user/project").unwrap();
        assert_eq!(ws.path, "/home/user/project");
        assert_eq!(ws.name, "project");
        assert!(svc.current().is_some());
    }

    #[test]
    fn 同じパスを再度開くとlast_opened_atが更新されること() {
        let (_tmp, svc) = setup();
        let ws1 = svc.open("/home/user/project").unwrap();
        std::thread::sleep(std::time::Duration::from_millis(10));
        let ws2 = svc.open("/home/user/project").unwrap();

        assert_eq!(ws1.id, ws2.id);
        assert!(ws2.last_opened_at >= ws1.last_opened_at);

        // 重複なし
        assert_eq!(svc.list().len(), 1);
    }

    #[test]
    fn ワークスペースを閉じるとcurrentがNoneになること() {
        let (_tmp, svc) = setup();
        svc.open("/home/user/project").unwrap();
        svc.close().unwrap();
        assert!(svc.current().is_none());
    }

    #[test]
    fn workspace_idが決定論的であること() {
        let id1 = WorkspaceService::workspace_id("/home/user/project");
        let id2 = WorkspaceService::workspace_id("/home/user/project");
        assert_eq!(id1, id2);
        assert_eq!(id1.len(), 16);
    }

    #[test]
    fn workspaces_jsonに永続化されること() {
        let tmp = TempDir::new().unwrap();
        {
            let svc = WorkspaceService::new(tmp.path());
            svc.open("/home/user/project").unwrap();
        }

        // 再度読み込んで一覧が復元されることを確認
        let svc2 = WorkspaceService::new(tmp.path());
        assert_eq!(svc2.list().len(), 1);
        assert_eq!(svc2.list()[0].path, "/home/user/project");
    }
}
