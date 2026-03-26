use crate::models::config::AppConfig;

/// 設定管理サービス（スタブ）
/// 後続フェーズで実装する
pub struct ConfigService {
    config: AppConfig,
}

impl ConfigService {
    pub fn new() -> Self {
        Self {
            config: AppConfig::default(),
        }
    }

    /// 現在の設定を返す
    pub fn get_config(&self) -> &AppConfig {
        &self.config
    }
}
