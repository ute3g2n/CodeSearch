// ワークスペーススストア（スタブ実装）
// Phase 1-7 以降で本実装予定

import { create } from "zustand";
import type { Workspace, IndexStatus } from "../ipc/types";

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  recentWorkspaces: Workspace[];
  indexStatus: IndexStatus;

  openWorkspaceDialog: () => Promise<void>;
  openWorkspace: (path: string) => Promise<void>;
  closeWorkspace: () => Promise<void>;
  loadRecentWorkspaces: () => Promise<void>;
  updateIndexStatus: (status: Partial<IndexStatus>) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: null,
  recentWorkspaces: [],
  indexStatus: {
    state: "idle",
    documentCount: 0,
    lastBuiltAt: null,
    errorMessage: null,
  },

  openWorkspaceDialog: async () => {},
  openWorkspace: async (_path: string) => {},
  closeWorkspace: async () => {},
  loadRecentWorkspaces: async () => {},
  updateIndexStatus: (status) =>
    set((s) => ({ indexStatus: { ...s.indexStatus, ...status } })),
}));
