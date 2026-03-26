# CodeSearch — 基本設計書

**プロジェクト名:** CodeSearch
**文書バージョン:** 2.0
**作成日:** 2026-03-26
**前提文書:** CodeSearch 要件定義書 v2.4
**ステータス:** レビュー待ち

---

## 目次

1. [設計方針](#1-設計方針)
2. [システムアーキテクチャ](#2-システムアーキテクチャ)
3. [バックエンド設計（Rust / Tauri）](#3-バックエンド設計rust--tauri)
4. [フロントエンド設計（React / TypeScript）](#4-フロントエンド設計react--typescript)
5. [バックエンド⇔フロントエンド通信設計](#5-バックエンドフロントエンド通信設計)
6. [データ設計](#6-データ設計)
7. [全文検索エンジン設計](#7-全文検索エンジン設計)
8. [ファイル監視設計](#8-ファイル監視設計)
9. [シンタックスハイライト設計](#9-シンタックスハイライト設計)
10. [複数インスタンス設計](#10-複数インスタンス設計)
11. [エラーハンドリング・通知設計](#11-エラーハンドリング通知設計)
12. [パフォーマンス設計](#12-パフォーマンス設計)
13. [テスト方針](#13-テスト方針)
14. [ディレクトリ構成](#14-ディレクトリ構成)

---

## 1. 設計方針

### 1.1 アーキテクチャ原則

| 原則 | 説明 |
|------|------|
| **関心の分離** | Rustバックエンド（ファイルI/O・インデックス・永続化）とReactフロントエンド（UI・インタラクション）を明確に分離。Tauriコマンド（IPC）のみで疎結合に接続する |
| **単方向データフロー** | フロントエンドはZustandストアを中核とした単方向データフローで状態管理。バックエンドからのイベントもストアを経由してUIに伝播する |
| **コマンド/イベントパターン** | フロントエンド→バックエンドは「コマンド」（リクエスト/レスポンス）、バックエンド→フロントエンドは「イベント」（push通知）で通信する |
| **遅延ロード** | TextMate文法・インデックス・ファイルツリーは必要な時点で遅延ロードし、起動時間とメモリ消費を抑制する |
| **フェイルセーフ** | インデックス破損・ファイル監視のエラーなどはアプリクラッシュにせず、トースト通知で回復操作（再インデックスなど）を案内する |
| **マルチインスタンス安全** | 複数インスタンスが同一ワークスペースを開いても、データ破損が起きない排他制御を行う |

### 1.2 設計のスコープ

本書はシステム全体のアーキテクチャ、モジュール分割、データフロー、インターフェース定義を記述する「基本設計」である。各モジュール内部のアルゴリズムやUIコンポーネントの詳細レイアウトは後続の「詳細設計書」で定義する。

---

## 2. システムアーキテクチャ

### 2.1 全体構成図

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CodeSearch Process                          │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │              Frontend (WebView2 / React)                   │     │
│  │                                                            │     │
│  │  ┌──────────┐  ┌──────────────────────┐  ┌──────────┐     │     │
│  │  │ Explorer │  │  Search Sidebar      │  │ Editor   │     │     │
│  │  │  Panel   │  │ ┌──────┬──────┬────┐ │  │  Area    │     │     │
│  │  │          │  │ │SEARCH│BOOK- │HIGH│ │  │          │     │     │
│  │  │          │  │ │      │MARKS │LIGH│ │  │          │     │     │
│  │  │          │  │ │      │      │TS  │ │  │          │     │     │
│  │  │          │  │ └──────┴──────┴────┘ │  │          │     │     │
│  │  └────┬─────┘  └─────────┬────────────┘  └────┬─────┘     │     │
│  │       │                  │                     │           │     │
│  │  ┌────▼──────────────────▼─────────────────────▼────────┐  │     │
│  │  │              Zustand Store Layer                      │  │     │
│  │  │  ┌──────────┬──────────┬──────────┬──────────────┐   │  │     │
│  │  │  │Workspace │ Search   │ Bookmark │  Editor      │   │  │     │
│  │  │  │  Store   │ Store    │  Store   │  Store       │   │  │     │
│  │  │  ├──────────┼──────────┤          ├──────────────┤   │  │     │
│  │  │  │ Config   │Highlight │          │Notification  │   │  │     │
│  │  │  │  Store   │ Store    │          │  Store       │   │  │     │
│  │  │  └──────────┴──────────┴──────────┴──────────────┘   │  │     │
│  │  └──────────────────────┬───────────────────────────────┘  │     │
│  │                         │ Tauri IPC                        │     │
│  └─────────────────────────│──────────────────────────────────┘     │
│  ┌─────────────────────────▼──────────────────────────────────┐     │
│  │              Backend (Rust)                                 │     │
│  │  ┌───────────────────────────────────────────────────────┐ │     │
│  │  │              Command Router                            │ │     │
│  │  └──┬──────────┬──────────┬───────────┬─────────────┬────┘ │     │
│  │  ┌──▼───┐  ┌──▼────┐  ┌─▼──────┐  ┌▼────────┐  ┌▼─────┐ │     │
│  │  │ File │  │Search │  │Book-   │  │Workspace│  │Config│ │     │
│  │  │System│  │Engine │  │mark    │  │Manager  │  │      │ │     │
│  │  └──┬───┘  └──┬────┘  └─┬──────┘  └┬────────┘  └┬─────┘ │     │
│  │  ┌──▼─────────▼─────────▼──────────▼─────────────▼─────┐ │     │
│  │  │  Tantivy(+lock) │ SQLite(WAL) │ notify │ encoding_rs│ │     │
│  │  └─────────────────────────────────────────────────────┘ │     │
│  └──────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 プロセスモデル

CodeSearchは複数インスタンスの同時起動を許可する。各インスタンスは独立したプロセスとして動作する。

```
Main Thread (Tauri)
├── Window management, IPC dispatch, Event emission

Tokio Runtime
├── async tasks: search queries, file reads
├── spawn_blocking: index build, encoding detection
└── dedicated thread: file watcher (notify)
```

### 2.3 レイヤー定義

| レイヤー | 責務 | 依存方向 |
|---------|------|---------|
| **Presentation** (React) | UI描画、ユーザー入力受付 | → Store |
| **Store** (Zustand) | アプリ状態の集約、IPC発行/受信 | → IPC Bridge |
| **IPC Bridge** | Tauri invoke/listen のラッパー | → Backend Commands |
| **Command Router** (Rust) | エントリポイント、バリデーション | → Services |
| **Services** (Rust) | ビジネスロジック | → Infrastructure |
| **Infrastructure** (Rust) | 外部ライブラリ・OS・FS接続 | (外部) |

---

## 3. バックエンド設計（Rust / Tauri）

### 3.1 クレート構成

```
src-tauri/src/
├── main.rs
├── state.rs            # AppState
├── errors.rs
├── commands/           # file.rs, search.rs, bookmark.rs, workspace.rs, config.rs
├── services/           # file_service.rs, search_service.rs, bookmark_service.rs,
│                       # workspace_service.rs, config_service.rs
├── indexer/            # index_manager.rs, schema.rs, tokenizer.rs, searcher.rs
├── watcher/            # file_watcher.rs
├── storage/            # database.rs, bookmark_repo.rs, history_repo.rs, settings_store.rs
├── encoding/           # detector.rs
└── models/             # file.rs, search.rs, bookmark.rs, workspace.rs, config.rs
```

### 3.2 AppState

```rust
pub struct AppState {
    pub workspace_service: Arc<WorkspaceService>,
    pub search_service: Arc<RwLock<SearchService>>,    // Read並行, Write排他
    pub bookmark_service: Arc<BookmarkService>,
    pub config_service: Arc<RwLock<ConfigService>>,
    pub file_watcher: Arc<Mutex<Option<FileWatcher>>>, // ワークスペース切替時に差替
    pub database: Arc<Database>,                        // WALモード + busy_timeout
}
```

### 3.3 モジュール責務一覧

#### 3.3.1 commands/

| モジュール | 主要コマンド | 概要 |
|-----------|-------------|------|
| `file.rs` | `get_file_tree`, `read_file`, `reveal_in_os_explorer`, `get_relative_path` | ファイルツリー、読み込み（エンコーディング判定付き）、OS表示、相対パス |
| `search.rs` | `search_fulltext`, `search_regex`, `build_index`, `get_index_status` | 全文検索、正規表現検索、インデックス構築、ステータス |
| `bookmark.rs` | `add_bookmark`, `remove_bookmark`, `get_bookmarks`, `clear_bookmarks_by_color` | ブックマークCRUD |
| `workspace.rs` | `open_workspace`, `close_workspace`, `list_recent_workspaces`, `select_directory` | ワークスペース操作 |
| `config.rs` | `get_config`, `update_config` | 設定の読み書き |

#### 3.3.2 services/

| モジュール | 責務 |
|-----------|------|
| `file_service.rs` | ディレクトリ走査、バイナリ判定、ファイル読み込み（encoding_rs） |
| `search_service.rs` | インデックス構築・検索・更新。正規表現フォールバック。検索履歴記録。書き込みロック管理 |
| `bookmark_service.rs` | CRUD、色別グループ取得、行番号自動調整 |
| `workspace_service.rs` | ライフサイクル管理（開く→インデックスロード→監視開始→閉じる） |
| `config_service.rs` | settings.json の読み書き、デフォルト値マージ |

#### 3.3.3 indexer/

| モジュール | 責務 |
|-----------|------|
| `schema.rs` | Tantivyスキーマ定義（file_path, line_number, line_content, content） |
| `tokenizer.rs` | lindera日本語トークナイザ、カスタムトークナイザチェーン |
| `index_manager.rs` | open/create/commit/optimize。書き込みロック管理（flock） |
| `searcher.rs` | クエリパーサー、検索実行、結果グルーピング、スニペット生成 |

#### 3.3.4 storage/

| モジュール | 責務 |
|-----------|------|
| `database.rs` | SQLite初期化（WALモード + busy_timeout=5000ms）、マイグレーション |
| `bookmark_repo.rs` | bookmarks CRUD |
| `history_repo.rs` | search_history CRUD |
| `settings_store.rs` | settings.json 読み書き |

### 3.4 主要データフロー

#### 3.4.1 初回起動（ワークスペース未選択）

```
Tauri起動 → settings.json ロード → React レンダリング
  ├─► ExplorerPanel: 「フォルダーを開く」ボタン表示
  └─► EditorArea: ウェルカムタブ表示
        ├─ アプリ名・バージョン
        ├─ 「フォルダーを開く」ボタン
        ├─ 最近のワークスペース一覧
        └─ ショートカット案内
```

#### 3.4.2 ワークスペースを開く

```
User clicks "フォルダーを開く"
  → invoke("select_directory") → invoke("open_workspace", { path })
  → WorkspaceService::open(path)
      ├─ workspaces.json 追記
      ├─ IndexManager::open_or_create() + 書き込みロック取得試行
      ├─ FileWatcher::start()
      └─ return WorkspaceInfo { ..., hasIndexWriteLock }
  → Frontend:
      ├─ ExplorerPanel → ファイルツリー表示
      ├─ ウェルカムタブ → 自動クローズ
      ├─ NotificationStore → インデックス構築トースト（進捗バー付き）
  → Background: IndexManager::build_full()
      ├─ emit "index://progress" (100ファイルごと) → トースト進捗バー更新
      └─ emit "index://ready" → 「構築完了（N ファイル）」トースト
```

#### 3.4.3 全文検索の実行

```
User types query in SEARCHセクション (debounce 300ms)
  → invoke("search_fulltext", { query, options })
  → SearchService::search() → Tantivy or regex fallback
  → return SearchResult { groups, totalMatches, elapsedMs }
  → Frontend:
      ├─ SEARCHセクション: 結果リスト表示
      ├─ マッチ行クリック → EditorStore.openFile(path, { lineNumber }) → 該当行ジャンプ
      └─ EditorStore: アクティブファイルのマッチ位置をハイライト
```

#### 3.4.4 ファイル変更のリアルタイム反映

```
[OS] ファイル変更 → notify → debounce 500ms → batch
  → 書き込みロック保持インスタンスのみ:
      ├─ IndexManager::update_document()
      └─ BookmarkService::adjust_line_numbers()
  → emit "fs://changed", "index://updated"
  → Frontend: ツリー差分更新、開いているファイルの再読み込みプロンプト
```

#### 3.4.5 ハイライトワードの操作

```
User selects text → 右クリック → 「選択部分をハイライト」
  → HighlightStore.addHighlight(text) — フロントエンドのみで完結
      ├─ 20色から次の色を自動割り当て
      ├─ 全エディタのCodeView: 該当テキストを背景色ハイライト
      └─ HIGHLIGHTSセクション: リスト更新

→/← ナビゲーション:
  → HighlightStore.navigateNext/Prev()
  → カーソル位置から前方/後方のマッチ箇所にジャンプ（末尾/先頭でラップ）
```

---

## 4. フロントエンド設計（React / TypeScript）

### 4.1 コンポーネントツリー

```
<App>
├── <TitleBar />
├── <QuickOpen />                    # Ctrl+P モーダル
├── <MainLayout>
│   ├── <ActivityBar />              # エクスプローラー / 検索
│   ├── <SidebarContainer>
│   │   ├── <ExplorerPanel />        # ファイルツリー + 「フォルダーを開く」
│   │   └── <SearchSidebar />        # 3サブセクション（各開閉可能）
│   │       ├── <SearchSection />    # SEARCH
│   │       ├── <BookmarkSection />  # BOOKMARKS
│   │       └── <HighlightSection /> # HIGHLIGHTS
│   ├── <EditorArea>
│   │   ├── <EditorGroup>
│   │   │   ├── <TabBar> → <Tab />
│   │   │   └── <EditorContent>
│   │   │       ├── <CodeView />     # Gutter + CodeLines + Minimap
│   │   │       ├── <SearchEditor />
│   │   │       ├── <PlainTextView />
│   │   │       └── <WelcomeTab />
│   │   ├── <EditorGroup /> ...
│   │   └── <SplitHandle />
├── <StatusBar />
├── <ContextMenu />                  # エディタ内右クリック
├── <TabContextMenu />               # タブ右クリック
├── <HighlightContextMenu />         # HIGHLIGHTS項目の右クリック（削除/全削除）
├── <ColorPalette />                 # ブックマーク色選択
└── <ToastContainer />               # 右下トースト通知
```

### 4.2 Zustandストア設計（7ストア）

#### 4.2.1 WorkspaceStore
ワークスペース管理。`hasIndexWriteLock` で書き込み権の有無を保持。

#### 4.2.2 EditorStore
タブ・画面分割管理。Tab型に `'welcome'` kind を追加。`openWelcomeTab()` アクション。タブコンテキストメニュー用の `closeOtherTabs`, `closeTabsToRight`, `closeAllTabs`, `splitLeft/Right/Up/Down`, `copyAbsolutePath`, `copyRelativePath`, `copyRelativePathPosix`, `revealInOsExplorer`, `revealInSidebarExplorer` アクション。

#### 4.2.3 SearchStore
検索クエリ・オプション・結果・履歴の管理。

#### 4.2.4 BookmarkStore
ブックマークCRUD、色別グループ、ソート。

#### 4.2.5 HighlightStore
**フロントエンドのみ（バックエンド通信なし）。セッション単位。**

```typescript
interface HighlightStore {
  highlights: HighlightWord[];
  nextColorIndex: number;                    // 0-19 ローテーション

  addHighlight: (text: string, ignoreCase?: boolean) => void;
  removeHighlight: (id: string) => void;
  removeAll: () => void;
  navigateNext: (id: string, filePath: string, line: number) => MatchPosition | null;
  navigatePrev: (id: string, filePath: string, line: number) => MatchPosition | null;
}

interface HighlightWord {
  id: string;
  text: string;
  ignoreCase: boolean;
  colorIndex: number;                        // 0-19
  color: string;                             // HEXカラー値
}
```

#### 4.2.6 ConfigStore
設定の読み書き。

#### 4.2.7 NotificationStore
トースト通知の管理。進捗バー付き通知、自動消去、アクションボタン対応。

```typescript
interface NotificationStore {
  notifications: Notification[];

  addNotification: (n: Omit<Notification, 'id' | 'createdAt'>) => string;
  updateProgress: (id: string, progress: { current: number; total: number }) => void;
  removeNotification: (id: string) => void;
}

interface Notification {
  id: string;
  type: 'info' | 'progress' | 'error';
  message: string;
  progress?: { current: number; total: number };
  actions?: { label: string; onClick: () => void }[];
  autoCloseMs?: number;
  createdAt: number;
}
```

### 4.3 コンポーネント設計方針

#### CodeView
仮想スクロール（react-virtuoso）、TextMate + WebWorker、ガター（行番号+ブックマークドット）、ミニマップ（Canvas、ON/OFF）、検索マッチハイライト（SearchStore連携）、ハイライトワード背景色（HighlightStore連携、可視行のみマッチ走査）。

#### SearchSidebar（3サブセクション）
SEARCH / BOOKMARKS / HIGHLIGHTS 各セクションはヘッダクリックで個別開閉。サイドバー全体はアクティビティバーで開閉。SEARCHセクションのマッチ行クリックでファイル開き+行ジャンプ。

#### ExplorerPanel
ワークスペース未選択時は「フォルダーを開く」ボタンを表示。遅延読み込み（展開時にサブディレクトリ取得）。

#### WelcomeTab
`WorkspaceStore.currentWorkspace === null` 時にEditorStoreに自動追加。ワークスペース選択で自動クローズ。

#### ToastContainer
画面右下。進捗バー付き通知対応。複数通知は垂直積み上げ。

---

## 5. バックエンド⇔フロントエンド通信設計

### 5.1 Tauriコマンド一覧

| コマンド名 | 引数 | 戻り値 | 概要 |
|-----------|------|--------|------|
| `select_directory` | — | `Option<String>` | フォルダ選択ダイアログ |
| `open_workspace` | `{ path }` | `WorkspaceInfo` | ワークスペースを開く |
| `close_workspace` | — | `()` | ワークスペースを閉じる |
| `list_recent_workspaces` | — | `Vec<Workspace>` | 最近のワークスペース |
| `get_file_tree` | `{ path, depth }` | `Vec<FileNode>` | ツリー取得 |
| `read_file` | `{ path }` | `FileContent` | ファイル読み込み |
| `search_fulltext` | `{ query, options }` | `SearchResult` | 全文検索 |
| `get_search_history` | `{ limit }` | `Vec<HistoryEntry>` | 検索履歴 |
| `add_bookmark` | `{ workspace_id, file_path, line_number, color_index, preview_text }` | `Bookmark` | ブックマーク追加 |
| `remove_bookmark` | `{ id }` | `()` | ブックマーク削除 |
| `get_bookmarks` | `{ workspace_id }` | `Vec<Bookmark>` | ブックマーク一覧 |
| `clear_bookmarks_by_color` | `{ workspace_id, color_index }` | `()` | 色別一括削除 |
| `get_config` | — | `AppConfig` | 設定取得 |
| `update_config` | `{ config }` | `AppConfig` | 設定更新 |
| `build_index` | — | `()` | インデックス再構築 |
| `get_index_status` | — | `IndexStatus` | インデックス状態 |
| `search_files` | `{ query, limit }` | `Vec<FileMatch>` | ファイル名あいまい検索 |
| `reveal_in_os_explorer` | `{ path }` | `()` | OSエクスプローラーで表示 |
| `get_relative_path` | `{ path, posix }` | `String` | 相対パス取得 |

注: ハイライトワード機能はフロントエンドのみで完結するため、対応コマンドなし。

### 5.2 Tauriイベント一覧

| イベント名 | ペイロード | タイミング |
|-----------|----------|-----------|
| `index://progress` | `{ indexed, total, current_file }` | 構築中（100ファイルごと） |
| `index://ready` | `{ workspace_id, document_count }` | 構築完了 |
| `index://error` | `{ message }` | インデックスエラー |
| `index://updated` | `{ affected_paths }` | インクリメンタル更新完了 |
| `fs://changed` | `{ changes }` | ファイル変更検知 |
| `config://changed` | `{ config }` | 設定変更 |
| `watcher://error` | `{ message }` | ファイル監視エラー |

### 5.3 型定義（共有モデル）

```typescript
interface WorkspaceInfo {
  workspace: Workspace;
  indexStatus: 'building' | 'ready' | 'empty';
  fileCount: number;
  hasIndexWriteLock: boolean;
}

interface SearchResult {
  groups: SearchResultGroup[];
  totalMatches: number;
  elapsedMs: number;
}

interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  matchRanges: [number, number][];
}

interface IndexStatus {
  state: 'idle' | 'building' | 'ready' | 'error';
  documentCount: number;
  lastBuiltAt: string | null;
  errorMessage: string | null;
}
```

---

## 6. データ設計

### 6.1 永続化データ

| データ | 形式 | ファイル | スコープ |
|--------|------|---------|---------|
| アプリ設定 | JSON | `data/settings.json` | グローバル |
| ワークスペースリスト | JSON | `data/workspaces.json` | グローバル |
| ブックマーク | SQLite | `data/bookmarks.db` | ワークスペース別 |
| 検索履歴 | SQLite | `data/search_history.db` | ワークスペース別 |
| インデックス | Tantivy | `data/indexes/<id>/` | ワークスペース別 |
| ハイライトワード | (なし) | メモリのみ | セッション単位 |

### 6.2 SQLiteスキーマ

```sql
PRAGMA journal_mode=WAL;
PRAGMA busy_timeout=5000;

CREATE TABLE bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL, file_path TEXT NOT NULL,
  line_number INTEGER NOT NULL, color_index INTEGER NOT NULL CHECK(color_index BETWEEN 0 AND 14),
  preview_text TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, file_path, line_number)
);

CREATE TABLE search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL, query TEXT NOT NULL,
  is_regex BOOLEAN DEFAULT 0, case_sensitive BOOLEAN DEFAULT 0, whole_word BOOLEAN DEFAULT 0,
  include_glob TEXT, exclude_glob TEXT, result_count INTEGER,
  searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 6.3 Tantivyインデックススキーマ

1ドキュメント = 1行。`file_path`(STRING|STORED), `line_number`(INDEXED|STORED), `line_content`(TEXT|STORED, ja_tokenizer), `content`(TEXT)。

---

## 7. 全文検索エンジン設計

インデックス検索（Tantivy, 100ms以内）と正規表現検索（regexクレート, ファイル直接走査）の2モード。トークナイザ: LinderaTokenizer(IPADIC) → LowerCaseFilter。インクリメンタル更新: ファイル単位で既存ドキュメント全削除→全行再登録→commit。

---

## 8. ファイル監視設計

notify → debounce 500ms → batch → Event Processor → IndexManager（書き込みロック保持時のみ）+ BookmarkService + Tauri Event Emit。除外パターン: excludePatterns + .gitignore + バイナリ判定。

---

## 9. シンタックスハイライト設計

TextMate文法（.tmLanguage.json）をWebWorkerで非同期トークナイズ。可視範囲を優先し段階的に処理。50〜80言語同梱。Dark+テーマのtokenColorsをCSS変数に変換。

---

## 10. 複数インスタンス設計

### 10.1 インデックス書き込みロック

`data/indexes/<workspace_id>/.write.lock` にflockで排他ロック。取得成功 → 構築・更新・監視からの自動更新を実行。取得失敗 → 読み取り専用で動作し、トースト通知で案内。

### 10.2 SQLite同時アクセス

WALモード + busy_timeout=5000ms。複数インスタンスからの同時読み取りと単一書き込みが可能。

### 10.3 設定ファイル

last-write-wins。他インスタンスへの反映はアプリ再起動時。

---

## 11. エラーハンドリング・通知設計

### 11.1 エラー型

```rust
pub enum AppError {
    FileNotFound { path: String },
    EncodingError { path: String },
    IndexError { message: String },
    IndexLockUnavailable,
    DatabaseError(rusqlite::Error),
    WatcherError(notify::Error),
    IoError(std::io::Error),
    InvalidArgument { message: String },
}
```

### 11.2 トースト通知マッピング

| イベント | 通知タイプ | メッセージ | アクション |
|---------|----------|----------|----------|
| `index://progress` | progress | 「インデックスを構築しています...」+ 進捗バー | — |
| `index://ready` | info (5秒自動消去) | 「構築完了（N ファイル）」| — |
| `index://error` | error (手動閉じ) | 「構築に失敗しました」| 「再試行」 |
| `watcher://error` | error (手動閉じ) | 「ファイル監視が停止しました」| 「再接続」 |
| `IndexLockUnavailable` | info (5秒自動消去) | 「別のインスタンスが更新中です（読み取り専用）」| — |

---

## 12. パフォーマンス設計

### 12.1 起動シーケンス

```
T=0ms    Tauri起動
T=100ms  settings.json ロード
T=150ms  React レンダリング
         └─ ワークスペースなし → ExplorerPanel「フォルダーを開く」+ WelcomeTab
T=200ms  workspaces.json → 前回のワークスペースを自動で開く
T=300ms  Tantivyインデックスopen + 書き込みロック取得試行
T=400ms  FileWatcher開始
T=500ms  ファイルツリー取得
T=600ms  前回のタブ復元
T=800ms  TextMate文法の遅延ロード
T<3000ms 初期ロード完了
```

### 12.2 メモリ管理

ファイル内容はタブクローズで解放。トークナイズ結果はLRU（20件）。ハイライトワードは登録数比例（実用上問題なし）。

---

## 13. テスト方針

### 13.1 Rust側の重点テスト

indexer（構築・検索・書き込みロック排他）、encoding（各エンコーディング判定）、watcher（デバウンス）、storage（WALモード同時アクセス）、bookmark_service（行番号自動調整）。

### 13.2 フロントエンド側の重点テスト

EditorStore（タブ操作全般、ウェルカムタブ自動開閉）、HighlightStore（追加/削除/全削除、20色ローテーション、navigateのラップ動作）、NotificationStore（進捗バー更新、自動消去）、CodeView（ブックマークドット、ハイライトワード背景色）、ContextMenu（「選択部分をハイライト」含む5パターン）、TabContextMenu（ファイルvs検索のメニュー差分）。

---

## 14. ディレクトリ構成

```
codesearch/
├── src-tauri/
│   ├── Cargo.toml, tauri.conf.json, build.rs
│   ├── src/
│   │   ├── main.rs, state.rs, errors.rs
│   │   ├── commands/    (file, search, bookmark, workspace, config)
│   │   ├── services/    (file, search, bookmark, workspace, config)
│   │   ├── indexer/     (index_manager, schema, tokenizer, searcher)
│   │   ├── watcher/     (file_watcher)
│   │   ├── storage/     (database, bookmark_repo, history_repo, settings_store)
│   │   ├── encoding/    (detector)
│   │   └── models/      (file, search, bookmark, workspace, config)
│   └── tests/           (index, search, bookmark, multi_instance)
│
├── src/
│   ├── main.tsx, App.tsx
│   ├── components/
│   │   ├── layout/      (TitleBar, ActivityBar, SidebarContainer, EditorArea, StatusBar, MainLayout)
│   │   ├── explorer/    (ExplorerPanel, TreeNode)
│   │   ├── search/      (SearchSidebar, SearchSection, SearchResultList, SearchEditor,
│   │   │                 SearchInput, BookmarkSection, BookmarkGroup,
│   │   │                 HighlightSection, HighlightItem)
│   │   ├── editor/      (EditorGroup, TabBar, Tab, CodeView, Gutter, CodeLines,
│   │   │                 Minimap, PlainTextView, WelcomeTab, SplitHandle)
│   │   ├── common/      (QuickOpen, ContextMenu, TabContextMenu, HighlightContextMenu,
│   │   │                 ColorPalette, ToastContainer, Toast, Icon)
│   │   └── settings/    (SettingsPanel)
│   ├── stores/          (workspace, editor, search, bookmark, highlight, config, notification)
│   ├── ipc/             (commands, events, types)
│   ├── workers/         (highlight.worker.ts)
│   ├── hooks/           (useKeyboard, useContextMenu, useDebounce)
│   ├── i18n/            (index, ja.json, en.json)
│   ├── theme/           (colors.ts, global.css)
│   └── utils/           (fileIcons, languageMap, format)
│
├── grammars/            (language-map.json, themes/, *.tmLanguage.json)
├── public/icons/
├── tests/               (stores/, components/, e2e/)
├── package.json, tsconfig.json, vite.config.ts
├── THIRD_PARTY_LICENSES
└── README.md
```
