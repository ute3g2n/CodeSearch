use serde::{Deserialize, Serialize};

/// アプリケーション設定（settings.json と1:1対応）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppConfig {
    /// エディタフォントファミリー
    pub editor_font_family: String,
    /// エディタフォントサイズ（px）
    pub editor_font_size: u32,
    /// UIフォントファミリー
    pub ui_font_family: String,
    /// UIフォントサイズ（px）
    pub ui_font_size: u32,
    /// ミニマップ表示
    pub minimap_enabled: bool,
    /// UI言語（"ja" | "en"）
    pub language: String,
    /// インデックス除外パターン（glob形式のリスト）
    pub exclude_patterns: Vec<String>,
    /// 最後に開いていたワークスペースのID（自動復元用）
    pub last_workspace_id: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            editor_font_family: "Consolas, 'Courier New', monospace".to_string(),
            editor_font_size: 14,
            ui_font_family: "Segoe UI, sans-serif".to_string(),
            ui_font_size: 13,
            minimap_enabled: true,
            language: "ja".to_string(),
            exclude_patterns: vec![
                ".git".to_string(),
                "node_modules".to_string(),
                ".svn".to_string(),
                "__pycache__".to_string(),
                "target".to_string(),
                "*.exe".to_string(),
                "*.dll".to_string(),
                "*.so".to_string(),
                "*.dylib".to_string(),
                "*.class".to_string(),
                "*.o".to_string(),
                "*.obj".to_string(),
            ],
            last_workspace_id: None,
        }
    }
}
