# CodeSearch

ローカルコード全文検索ツール（Tauri v2 + React + TypeScript + Tantivy）

## 概要

CodeSearch はローカルのソースコードリポジトリを高速に全文検索するデスクトップアプリケーションです。
VS Code ライクな UI に加え、ブックマーク・ハイライトワード・画面分割などの機能を提供します。

## 主な機能

- **全文検索**: Tantivy による高速インデックス検索（100ms 以内、1万ファイル目標）
- **シンタックスハイライト**: Tree-sitter ベースのトークナイザ対応
- **ブックマーク**: 行単位でカラー付きブックマークを登録・ジャンプ
- **ハイライトワード**: 最大20色でキーワードをハイライト、前後ナビゲーション
- **画面分割**: タブの右分割・ドラッグによる幅調整
- **ワークスペース管理**: 複数フォルダの履歴管理・自動インデックス復元
- **検索履歴**: 過去の検索クエリを履歴から再利用
- **複数インスタンス対応**: flock による書き込みロック排他制御
- **多言語 UI**: 日本語 / English 切替

## 開発環境セットアップ

### 必要なツール

- Node.js 20+
- Rust 1.77+（`rustup` 推奨）
- Tauri CLI v2: `cargo install tauri-cli`

### 依存関係インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run tauri dev
```

### プロダクションビルド

```bash
npm run tauri build
```

ビルド成果物は `src-tauri/target/release/bundle/` 以下に出力されます（詳細は「配布パッケージ作成」を参照）。

## テスト実行

### フロントエンドテスト（Vitest）

```bash
npm test
```

### E2Eテスト（Playwright）

```bash
npm run test:e2e
```

テスト結果レポートを表示するには:

```bash
npm run test:e2e:report
```

### バックエンドテスト（Rust）

```bash
cd src-tauri
cargo test
```

### Rustリントチェック（Clippy）

```bash
cd src-tauri
cargo clippy -- -D warnings
```

## 配布パッケージ作成

CodeSearch はインストーラー不要のポータブル配布です。
zip を展開してそのまま `codesearch.exe`（または `codesearch`）を実行できます。
設定・インデックスデータは exe と同じディレクトリの `data/` に保存されます。

付属スクリプトでポータブル zip を生成します:

```bash
bash scripts/package.sh
```

内部で `npm run tauri build -- --no-bundle` を実行し、インストーラーを生成しません。

成果物:
- `dist-package/codesearch.exe`（Windows）または `dist-package/codesearch`（macOS/Linux）
- `dist-package/data/`（初回起動前の空ディレクトリ）
- `CodeSearch-<version>-<platform>.zip`

## ディレクトリ構成

```
CodeSearch/
├── src/                    # React + TypeScript フロントエンド
│   ├── components/         # UIコンポーネント
│   │   ├── editor/         # エディタ関連（TabBar, CodeView, SplitHandle）
│   │   ├── layout/         # レイアウト（MainLayout, EditorArea, SidebarContainer）
│   │   ├── search/         # 検索関連（SearchSection, BookmarkSection, HighlightSection）
│   │   ├── settings/       # 設定パネル（SettingsPanel）
│   │   └── common/         # 共通コンポーネント（ContextMenu, Toast）
│   ├── stores/             # Zustand ストア
│   ├── i18n/               # 翻訳ファイル（ja.json, en.json）
│   ├── ipc/                # Tauri IPC ラッパー
│   └── workers/            # Web Worker（トークナイザ）
├── src-tauri/              # Rust バックエンド
│   ├── src/
│   │   ├── commands/       # Tauri コマンド（IPC エンドポイント）
│   │   ├── indexer/        # Tantivy インデックス管理
│   │   ├── services/       # ビジネスロジック
│   │   ├── storage/        # SQLite リポジトリ・設定ストア
│   │   ├── models/         # データモデル定義
│   │   └── watcher/        # ファイル監視
│   └── tests/              # 統合テスト
├── tests/                  # フロントエンドテスト
│   └── stores/             # ストアユニットテスト
└── grammars/               # Tree-sitter 文法ファイル
```

## データ保存場所

ポータブル運用のため、全 OS 共通で **exe 実行ディレクトリ配下の `data/`** に保存されます。

```
CodeSearch-0.1.0-Windows/
├── codesearch.exe
└── data/                  ← 設定・インデックス・DBがここに保存される
    ├── settings.json
    ├── codesearch.db
    ├── indexes/
    └── workspaces.json
```

zip を別ディレクトリに展開すれば、データを分離した複数環境の並行運用が可能です。

## 設定ファイル

`settings.json` はデータディレクトリに保存されます。アプリ内の設定パネルから変更可能です。

## ライセンス

MIT License
