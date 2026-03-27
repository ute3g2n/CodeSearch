/// 複数インスタンス対応の統合テスト
/// 書き込みロックの排他制御を検証する
///
/// 基本設計書セクション10.1に基づく

use codesearch_lib::indexer::index_manager::IndexManager;
use tempfile::TempDir;

/// 1インスタンスが書き込みロックを取得できること
#[test]
fn 一つ目のインスタンスが書き込みロックを取得できること() {
    let tmp = TempDir::new().unwrap();
    let manager = IndexManager::open_or_create(tmp.path(), "ws-lock-1").unwrap();
    assert!(
        manager.has_write_lock,
        "最初のインスタンスはロックを取得できるべき"
    );
}

/// 2インスタンス目はロック取得に失敗すること
#[test]
fn 二つ目のインスタンスはロック取得に失敗すること() {
    let tmp = TempDir::new().unwrap();

    // 1インスタンス目がロックを保持
    let manager1 = IndexManager::open_or_create(tmp.path(), "ws-lock-2").unwrap();
    assert!(manager1.has_write_lock, "1インスタンス目はロックを取得できるべき");

    // 2インスタンス目は同じワークスペースのロックを取得できない
    let manager2 = IndexManager::open_or_create(tmp.path(), "ws-lock-2").unwrap();
    assert!(
        !manager2.has_write_lock,
        "2インスタンス目はロックを取得できないべき"
    );
}

/// 異なるワークスペースは互いにロックを取得できること
#[test]
fn 異なるワークスペースは独立してロックを取得できること() {
    let tmp = TempDir::new().unwrap();

    let manager_a = IndexManager::open_or_create(tmp.path(), "ws-a").unwrap();
    let manager_b = IndexManager::open_or_create(tmp.path(), "ws-b").unwrap();

    assert!(manager_a.has_write_lock, "ws-a はロックを取得できるべき");
    assert!(manager_b.has_write_lock, "ws-b はロックを取得できるべき");
}
