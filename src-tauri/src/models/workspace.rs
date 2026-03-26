use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// ワークスペースの永続化エンティティ
/// 保存先: data/workspaces.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    /// ワークスペースの一意識別子（ルートパスのSHA-256先頭16文字）
    pub id: String,
    /// ワークスペースのルートディレクトリ絶対パス
    pub path: String,
    /// ワークスペース名（ルートディレクトリ名）
    pub name: String,
    /// 最後に開いた日時（ISO 8601）
    pub last_opened_at: DateTime<Utc>,
}

/// ワークスペースを開いた際に返却されるDTO
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceInfo {
    pub workspace: Workspace,
    /// インデックスの状態
    pub index_status: IndexStatusKind,
    /// ワークスペース内のファイル数（推定値）
    pub file_count: u64,
    /// このインスタンスがインデックス書き込みロックを取得できたか
    pub has_index_write_lock: bool,
}

/// インデックスの状態種別
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum IndexStatusKind {
    /// インデックス構築中
    Building,
    /// インデックス準備完了
    Ready,
    /// インデックス未構築（空）
    Empty,
}
