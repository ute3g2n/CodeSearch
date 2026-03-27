// WorkspaceStore
// ワークスペースのライフサイクル管理・インデックス状態を担う
import { create } from "zustand";
import type { Workspace, IndexStatus } from "../ipc/types";
import {
  selectDirectory,
  openWorkspace as ipcOpenWorkspace,
  closeWorkspace as ipcCloseWorkspace,
  listRecentWorkspaces,
  buildIndex,
  startFileWatcher,
} from "../ipc/commands";
import { useBookmarkStore } from "./bookmark";
import { useSearchStore } from "./search";

interface WorkspaceState {
  /** 現在開いているワークスペース（null = 未選択） */
  currentWorkspace: Workspace | null;
  /** 最近開いたワークスペース一覧 */
  recentWorkspaces: Workspace[];
  /** インデックス状態 */
  indexStatus: IndexStatus;

  /** フォルダー選択ダイアログを開いてワークスペースを開く */
  openWorkspaceDialog: () => Promise<void>;
  /** 指定パスのワークスペースを開く */
  openWorkspace: (path: string) => Promise<void>;
  /** 現在のワークスペースを閉じる */
  closeWorkspace: () => Promise<void>;
  /** 最近開いたワークスペース一覧を読み込む */
  loadRecentWorkspaces: () => Promise<void>;
  /** インデックス状態を更新する */
  updateIndexStatus: (status: Partial<IndexStatus>) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentWorkspace: null,
  recentWorkspaces: [],
  indexStatus: {
    state: "idle",
    documentCount: 0,
    lastBuiltAt: null,
    errorMessage: null,
  },

  openWorkspaceDialog: async () => {
    const path = await selectDirectory();
    if (path) {
      await get().openWorkspace(path);
    }
  },

  openWorkspace: async (path) => {
    // IPC でワークスペースを開く
    const info = await ipcOpenWorkspace(path);
    set({
      currentWorkspace: info.workspace,
      indexStatus: {
        state: "idle",
        documentCount: 0,
        lastBuiltAt: null,
        errorMessage: null,
      },
    });

    // ブックマーク一覧を読み込む
    await useBookmarkStore.getState().loadBookmarks(info.workspace.id);

    // インデックス構築を非同期で開始する（完了通知は useIndexEvents フックで受け取る）
    set((s) => ({ indexStatus: { ...s.indexStatus, state: "building" } }));
    buildIndex(path, info.workspace.id)
      .then((docCount) => {
        set({
          indexStatus: {
            state: "ready",
            documentCount: docCount,
            lastBuiltAt: new Date().toISOString(),
            errorMessage: null,
          },
        });
      })
      .catch((err) => {
        set((s) => ({
          indexStatus: {
            ...s.indexStatus,
            state: "error",
            errorMessage: String(err),
          },
        }));
      });

    // ファイル監視を開始する
    startFileWatcher(path, []).catch(() => {
      // 監視エラーは watcher://error イベントで通知されるため、ここでは無視する
    });
  },

  closeWorkspace: async () => {
    await ipcCloseWorkspace();
    set({
      currentWorkspace: null,
      indexStatus: {
        state: "idle",
        documentCount: 0,
        lastBuiltAt: null,
        errorMessage: null,
      },
    });
    // 検索結果をクリアする
    useSearchStore.getState().clearResult();
  },

  loadRecentWorkspaces: async () => {
    const recentWorkspaces = await listRecentWorkspaces();
    set({ recentWorkspaces });
  },

  updateIndexStatus: (status) =>
    set((s) => ({ indexStatus: { ...s.indexStatus, ...status } })),
}));
