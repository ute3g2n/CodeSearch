import { invoke } from "@tauri-apps/api/core";
import type {
  CommandError,
  FileContent,
  FileMatch,
  FileNode,
  WorkspaceInfo,
  Workspace,
  AppConfig,
  SearchOptions,
  SearchResult,
  HistoryEntry,
  Bookmark,
  IndexStatus,
} from "./types";

// IPC コマンドのエラーハンドリング共通ラッパー
async function invokeCommand<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (error) {
    // Tauri はコマンドのエラーを文字列にシリアライズして返す
    const commandError: CommandError =
      typeof error === "string"
        ? JSON.parse(error)
        : { code: "INTERNAL_ERROR", message: String(error) };
    throw commandError;
  }
}

// ===== ワークスペース系 =====

export async function selectDirectory(): Promise<string | null> {
  return invokeCommand<string | null>("select_directory");
}

export async function openWorkspace(path: string): Promise<WorkspaceInfo> {
  return invokeCommand<WorkspaceInfo>("open_workspace", { path });
}

export async function closeWorkspace(): Promise<void> {
  return invokeCommand<void>("close_workspace");
}

export async function listRecentWorkspaces(): Promise<Workspace[]> {
  return invokeCommand<Workspace[]>("list_recent_workspaces");
}

// ===== ファイル系 =====

export async function getFileTree(
  path: string,
  depth?: number
): Promise<FileNode[]> {
  return invokeCommand<FileNode[]>("get_file_tree", {
    path,
    depth: depth ?? 1,
  });
}

export async function readFile(path: string): Promise<FileContent> {
  return invokeCommand<FileContent>("read_file", { path });
}

export async function revealInOsExplorer(path: string): Promise<void> {
  return invokeCommand<void>("reveal_in_os_explorer", { path });
}

export async function getRelativePath(
  path: string,
  posix?: boolean
): Promise<string> {
  return invokeCommand<string>("get_relative_path", {
    path,
    posix: posix ?? false,
  });
}

export async function searchFiles(
  query: string,
  limit?: number
): Promise<FileMatch[]> {
  return invokeCommand<FileMatch[]>("search_files", {
    query,
    limit: limit ?? 50,
  });
}

// ===== 検索系 =====

export async function searchFulltext(
  query: string,
  options: SearchOptions
): Promise<SearchResult> {
  return invokeCommand<SearchResult>("search_fulltext", { query, options });
}

export async function buildIndex(): Promise<void> {
  return invokeCommand<void>("build_index");
}

export async function getIndexStatus(): Promise<IndexStatus> {
  return invokeCommand<IndexStatus>("get_index_status");
}

export async function getSearchHistory(limit?: number): Promise<HistoryEntry[]> {
  return invokeCommand<HistoryEntry[]>("get_search_history", {
    limit: limit ?? 100,
  });
}

// ===== ブックマーク系 =====

export async function addBookmark(
  workspaceId: string,
  filePath: string,
  lineNumber: number,
  colorIndex: number,
  previewText?: string
): Promise<Bookmark> {
  return invokeCommand<Bookmark>("add_bookmark", {
    workspaceId,
    filePath,
    lineNumber,
    colorIndex,
    previewText,
  });
}

export async function removeBookmark(id: number): Promise<void> {
  return invokeCommand<void>("remove_bookmark", { id });
}

export async function getBookmarks(workspaceId: string): Promise<Bookmark[]> {
  return invokeCommand<Bookmark[]>("get_bookmarks", { workspaceId });
}

export async function clearBookmarksByColor(
  workspaceId: string,
  colorIndex: number
): Promise<void> {
  return invokeCommand<void>("clear_bookmarks_by_color", {
    workspaceId,
    colorIndex,
  });
}

// ===== 設定系 =====

export async function getConfig(): Promise<AppConfig> {
  return invokeCommand<AppConfig>("get_config");
}

export async function updateConfig(config: AppConfig): Promise<AppConfig> {
  return invokeCommand<AppConfig>("update_config", { config });
}
