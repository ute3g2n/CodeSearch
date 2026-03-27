/// 検索パフォーマンスベンチマーク
///
/// 目標: 検索応答 100ms 以内（1万ファイル規模）
/// 実行: cargo bench --bench search_bench

use codesearch_lib::indexer::index_manager::IndexManager;
use codesearch_lib::indexer::searcher::Searcher;
use codesearch_lib::models::search::SearchOptions;

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use tempfile::TempDir;

/// インデックスに N ファイル × M 行を登録する
fn build_test_index(file_count: usize, lines_per_file: usize) -> (TempDir, IndexManager) {
    let tmp = TempDir::new().unwrap();
    let mut mgr = IndexManager::open_or_create(tmp.path(), "bench-ws").unwrap();

    for i in 0..file_count {
        let path = format!("/workspace/file_{i}.rs");
        let lines: Vec<String> = (0..lines_per_file)
            .map(|j| format!("fn function_{j}() {{ let x = {i}; println!(\"{{x}}\"); }}"))
            .collect();
        mgr.index_file(&path, &lines).unwrap();
    }
    mgr.commit().unwrap();
    (tmp, mgr)
}

/// 1000ファイル × 100行のインデックスで検索速度を計測する
fn bench_search_1k_files(c: &mut Criterion) {
    let (_tmp, mgr) = build_test_index(1_000, 100);
    let searcher = Searcher::new(&mgr).unwrap();
    let opts = SearchOptions {
        case_sensitive: false,
        whole_word: false,
        is_regex: false,
        include_glob: None,
        exclude_glob: None,
        max_results: Some(1_000),
    };

    c.bench_with_input(
        BenchmarkId::new("search_fulltext", "1k_files"),
        &"function_50",
        |b, query| {
            b.iter(|| {
                searcher
                    .search(black_box(query), black_box(&opts), "/workspace")
                    .unwrap()
            });
        },
    );
}

/// 10000ファイル × 100行のインデックスで検索速度を計測する（目標: 100ms以内）
fn bench_search_10k_files(c: &mut Criterion) {
    let (_tmp, mgr) = build_test_index(10_000, 100);
    let searcher = Searcher::new(&mgr).unwrap();
    let opts = SearchOptions {
        case_sensitive: false,
        whole_word: false,
        is_regex: false,
        include_glob: None,
        exclude_glob: None,
        max_results: Some(1_000),
    };

    c.bench_with_input(
        BenchmarkId::new("search_fulltext", "10k_files"),
        &"function_50",
        |b, query| {
            b.iter(|| {
                searcher
                    .search(black_box(query), black_box(&opts), "/workspace")
                    .unwrap()
            });
        },
    );
}

/// 正規表現検索のパフォーマンスを計測する
fn bench_search_regex(c: &mut Criterion) {
    let (_tmp, mgr) = build_test_index(1_000, 100);
    let searcher = Searcher::new(&mgr).unwrap();
    let opts = SearchOptions {
        case_sensitive: false,
        whole_word: false,
        is_regex: true,
        include_glob: None,
        exclude_glob: None,
        max_results: Some(500),
    };

    c.bench_with_input(
        BenchmarkId::new("search_regex", "1k_files"),
        &r"fn function_\d+",
        |b, query| {
            b.iter(|| {
                searcher
                    .search(black_box(query), black_box(&opts), "/workspace")
                    .unwrap()
            });
        },
    );
}

criterion_group!(
    benches,
    bench_search_1k_files,
    bench_search_10k_files,
    bench_search_regex,
);
criterion_main!(benches);
