use serde::{Deserialize, Serialize};

/// ファイルツリーの1ノード
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    /// ファイル/ディレクトリ名
    pub name: String,
    /// 絶対パス
    pub path: String,
    /// true=ディレクトリ, false=ファイル
    pub is_dir: bool,
    /// ディレクトリの場合の子ノード（遅延ロード時はNone）
    pub children: Option<Vec<FileNode>>,
    /// ファイル拡張子（ディレクトリの場合はNone）
    pub extension: Option<String>,
    /// ファイルサイズ（バイト）。ディレクトリの場合は0
    pub size: u64,
}

/// ファイル読み込み結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileContent {
    /// ファイル絶対パス
    pub path: String,
    /// UTF-8に変換済みのテキスト内容
    pub content: String,
    /// 検出されたエンコーディング名（例: "UTF-8", "Shift_JIS", "EUC-JP"）
    pub encoding: String,
    /// 総行数
    pub line_count: u64,
    /// ファイルサイズ（バイト、変換前）
    pub size: u64,
}

/// ファイル名あいまい検索結果（クイックオープン用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMatch {
    /// ファイル名
    pub name: String,
    /// ワークスペースルートからの相対パス
    pub relative_path: String,
    /// 絶対パス
    pub absolute_path: String,
    /// あいまい検索スコア（0.0〜1.0、高い方がマッチ度が高い）
    pub score: f64,
    /// マッチした文字のインデックス（ハイライト用）
    pub matched_indices: Vec<usize>,
}
