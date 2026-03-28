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

/// 書き込みロック保持中も読み取り検索ができること（test_read_while_locked）
#[test]
fn 書き込みロック保持中も読み取り検索ができること() {
    use codesearch_lib::indexer::searcher::Searcher;
    use codesearch_lib::models::search::SearchOptions;

    let tmp = TempDir::new().unwrap();

    // 1インスタンス目: 書き込みロック取得 + インデックス構築
    let mut writer = IndexManager::open_or_create(tmp.path(), "ws-read-locked").unwrap();
    assert!(writer.has_write_lock);
    writer
        .index_file(
            "/workspace/hello.rs",
            &["fn hello() {}".to_string(), "fn world() {}".to_string()],
        )
        .unwrap();
    writer.commit().unwrap();

    // 2インスタンス目: 書き込みロックなし（読み取り専用）
    let reader = IndexManager::open_or_create(tmp.path(), "ws-read-locked").unwrap();
    assert!(!reader.has_write_lock, "2インスタンス目は書き込みロックを取得できないこと");

    // 読み取り専用インスタンスでも検索できること
    let searcher = Searcher::new(&reader).unwrap();
    let opts = SearchOptions {
        case_sensitive: false,
        whole_word: false,
        is_regex: false,
        include_glob: None,
        exclude_glob: None,
        max_results: Some(100),
    };
    let result = searcher.search("hello", &opts, "/workspace").unwrap();
    assert!(!result.is_empty(), "読み取り専用インスタンスでも検索できること");
}

/// インスタンス終了時にロックが解放されること（test_lock_release_on_close）
#[test]
fn インスタンス終了時にロックが解放されること() {
    let tmp = TempDir::new().unwrap();

    // 1インスタンス目がロックを取得
    {
        let manager1 = IndexManager::open_or_create(tmp.path(), "ws-release").unwrap();
        assert!(manager1.has_write_lock, "1インスタンス目はロックを取得できるべき");

        // スコープ内でロック確認
        let manager2 = IndexManager::open_or_create(tmp.path(), "ws-release").unwrap();
        assert!(
            !manager2.has_write_lock,
            "1インスタンス目保持中は2インスタンス目がロックを取得できないこと"
        );
        // manager2 はここで drop される
    }
    // manager1 が drop されてロック解放

    // 1インスタンス目が終了（drop）した後、新たなインスタンスがロックを取得できること
    let manager3 = IndexManager::open_or_create(tmp.path(), "ws-release").unwrap();
    assert!(
        manager3.has_write_lock,
        "前インスタンス終了後に新インスタンスがロックを取得できること"
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
