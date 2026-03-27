// Tauri イベントのリスナー登録ユーティリティ
// バックエンドから emit されるイベントを TypeScript 型付きで受け取る
import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";

// ===== イベントペイロード型 =====

export interface FsChangedPayload {
  kind: "created" | "modified" | "deleted";
  filePath: string;
}

export interface IndexProgressPayload {
  current: number;
  total: number;
  message: string;
}

export interface IndexReadyPayload {
  docCount: number;
  elapsedMs: number;
}

export interface IndexUpdatedPayload {
  filePath: string;
  docCount: number;
}

export interface IndexErrorPayload {
  message: string;
}

export interface WatcherErrorPayload {
  message: string;
}

// ===== リスナー登録関数 =====

/** fs://changed イベント（ファイル作成/変更/削除） */
export function onFsChanged(
  handler: (payload: FsChangedPayload) => void
): Promise<UnlistenFn> {
  return listen<FsChangedPayload>("fs://changed", (e) => handler(e.payload));
}

/** index://progress イベント（インデックス構築進捗） */
export function onIndexProgress(
  handler: (payload: IndexProgressPayload) => void
): Promise<UnlistenFn> {
  return listen<IndexProgressPayload>("index://progress", (e) =>
    handler(e.payload)
  );
}

/** index://ready イベント（インデックス構築完了） */
export function onIndexReady(
  handler: (payload: IndexReadyPayload) => void
): Promise<UnlistenFn> {
  return listen<IndexReadyPayload>("index://ready", (e) => handler(e.payload));
}

/** index://updated イベント（ファイル単位のインデックス更新） */
export function onIndexUpdated(
  handler: (payload: IndexUpdatedPayload) => void
): Promise<UnlistenFn> {
  return listen<IndexUpdatedPayload>("index://updated", (e) =>
    handler(e.payload)
  );
}

/** index://error イベント（インデックスエラー） */
export function onIndexError(
  handler: (payload: IndexErrorPayload) => void
): Promise<UnlistenFn> {
  return listen<IndexErrorPayload>("index://error", (e) => handler(e.payload));
}

/** watcher://error イベント（ファイル監視エラー） */
export function onWatcherError(
  handler: (payload: WatcherErrorPayload) => void
): Promise<UnlistenFn> {
  return listen<WatcherErrorPayload>("watcher://error", (e) =>
    handler(e.payload)
  );
}

/** index://lock-failed イベント（他インスタンスがインデックスを使用中） */
export function onIndexLockFailed(
  handler: () => void
): Promise<UnlistenFn> {
  return listen("index://lock-failed", () => handler());
}
