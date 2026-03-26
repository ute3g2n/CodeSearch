// IPC通信で使用する共有型定義
// 詳細設計書 docs/03_フロントエンド型定義.md に基づく

// ===== ワークスペース =====

export interface Workspace {
  id: string;
  path: string;
  name: string;
  lastOpenedAt: string; // ISO 8601
}

export interface WorkspaceInfo {
  workspace: Workspace;
  indexStatus: "building" | "ready" | "empty";
  fileCount: number;
  hasIndexWriteLock: boolean;
}

// ===== ファイル =====

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children: FileNode[] | null;
  extension: string | null;
  size: number;
}

export interface FileContent {
  path: string;
  content: string;
  encoding: string;
  lineCount: number;
  size: number;
}

export interface FileMatch {
  name: string;
  relativePath: string;
  absolutePath: string;
  score: number;
  matchedIndices: number[];
}

// ===== 検索 =====

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  isRegex: boolean;
  includeGlob: string | null;
  excludeGlob: string | null;
  maxResults: number | null;
}

export interface SearchResult {
  groups: SearchResultGroup[];
  totalMatches: number;
  elapsedMs: number;
}

export interface SearchResultGroup {
  filePath: string;
  relativePath: string;
  matches: SearchMatch[];
}

export interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  matchRanges: [number, number][];
}

export interface HistoryEntry {
  id: number;
  workspaceId: string;
  query: string;
  isRegex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  includeGlob: string | null;
  excludeGlob: string | null;
  resultCount: number | null;
  searchedAt: string;
}

// ===== ブックマーク =====

export interface Bookmark {
  id: number;
  workspaceId: string;
  filePath: string;
  lineNumber: number;
  colorIndex: number;
  previewText: string | null;
  createdAt: string;
}

export interface AddBookmarkRequest {
  workspaceId: string;
  filePath: string;
  lineNumber: number;
  colorIndex: number;
  previewText?: string;
}

// ===== 設定 =====

export interface AppConfig {
  editorFontFamily: string;
  editorFontSize: number;
  uiFontFamily: string;
  uiFontSize: number;
  minimapEnabled: boolean;
  language: string;
  excludePatterns: string[];
  lastWorkspaceId: string | null;
}

// ===== インデックス状態 =====

export interface IndexStatus {
  state: "idle" | "building" | "ready" | "error";
  documentCount: number;
  lastBuiltAt: string | null;
  errorMessage: string | null;
}

// ===== エラー =====

export interface CommandError {
  code: string;
  message: string;
}
