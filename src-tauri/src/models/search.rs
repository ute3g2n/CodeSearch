use serde::{Deserialize, Serialize};

/// 検索オプション（フロントエンドから受け取る）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchOptions {
    /// 大文字小文字を区別する
    pub case_sensitive: bool,
    /// 単語単位マッチ
    pub whole_word: bool,
    /// 正規表現モード
    pub is_regex: bool,
    /// 含めるファイルパターン（glob形式、カンマ区切り）
    pub include_glob: Option<String>,
    /// 除外ファイルパターン（glob形式、カンマ区切り）
    pub exclude_glob: Option<String>,
    /// 最大結果数（デフォルト: 10000）
    pub max_results: Option<u32>,
}

/// 検索結果全体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    /// ファイルごとにグループ化された結果
    pub groups: Vec<SearchResultGroup>,
    /// マッチ総数
    pub total_matches: u64,
    /// 検索にかかった時間（ミリ秒）
    pub elapsed_ms: u64,
}

/// 1ファイル分の検索結果グループ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResultGroup {
    /// ファイル絶対パス
    pub file_path: String,
    /// ワークスペースルートからの相対パス
    pub relative_path: String,
    /// ファイル内のマッチ一覧
    pub matches: Vec<SearchMatch>,
}

/// 1行分のマッチ情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMatch {
    /// 行番号（1-based）
    pub line_number: u32,
    /// 行の全テキスト
    pub line_content: String,
    /// マッチ箇所の文字列範囲 [start, end)（0-based、行内オフセット）
    pub match_ranges: Vec<(usize, usize)>,
}

/// 検索履歴エントリ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: i64,
    pub workspace_id: String,
    pub query: String,
    pub is_regex: bool,
    pub case_sensitive: bool,
    pub whole_word: bool,
    pub include_glob: Option<String>,
    pub exclude_glob: Option<String>,
    pub result_count: Option<u64>,
    pub searched_at: String,
}

/// インデックス状態（フロントエンドに返す）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexStatus {
    pub state: IndexState,
    pub document_count: u64,
    pub last_built_at: Option<String>,
    pub error_message: Option<String>,
}

/// インデックス状態種別
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum IndexState {
    Idle,
    Building,
    Ready,
    Error,
}
