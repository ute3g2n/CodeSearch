// エディタストア
// タブ管理・ファイル内容キャッシュ・閉じたタブの復元を担う

import { create } from "zustand";
import { readFile } from "../ipc/commands";
import type { FileContent } from "../ipc/types";

/** タブの種類 */
export type TabKind = "file" | "search-editor" | "plain-text" | "welcome";

/** タブの共通情報 */
export interface Tab {
  id: string;
  kind: TabKind;
  title: string;
  filePath?: string;
  searchQuery?: string;
  plainText?: string;
  scrollTop?: number;
  cursorLine?: number;
}

/** エディタグループ（画面分割の1区画） */
export interface EditorGroup {
  id: string;
  tabs: Tab[];
  activeTabId: string | null;
}

/** 分割方向 */
export type SplitDirection = "left" | "right" | "up" | "down";

// 閉じたタブの最大保持件数
const MAX_CLOSED_TABS = 20;

// 初期グループID
const INITIAL_GROUP_ID = "group-1";

interface EditorState {
  groups: EditorGroup[];
  activeGroupId: string;
  fileContentCache: Map<string, FileContent>;
  /** 閉じたタブのスタック（最大20件）。末尾が最新 */
  closedTabsStack: Tab[];

  // アクション
  openFile: (
    path: string,
    options?: { lineNumber?: number; groupId?: string }
  ) => Promise<void>;
  openWelcomeTab: () => void;
  openSearchEditor: (query?: string) => void;
  openPlainText: (title: string, content: string) => void;
  closeTab: (groupId: string, tabId: string) => void;
  closeOtherTabs: (groupId: string, tabId: string) => void;
  closeTabsToRight: (groupId: string, tabId: string) => void;
  closeAllTabs: (groupId: string) => void;
  reopenClosedTab: () => void;
  setActiveTab: (groupId: string, tabId: string) => void;
  moveTab: (
    fromGroupId: string,
    tabId: string,
    toGroupId: string,
    toIndex: number
  ) => void;
  updateScrollTop: (tabId: string, scrollTop: number) => void;
  updateCursorLine: (tabId: string, line: number) => void;
}

/** ファイルパスからファイル名を取得する */
function fileNameFromPath(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

/** UUID v4 相当の ID を生成する */
function genId(): string {
  return crypto.randomUUID();
}

/** グループを更新するユーティリティ */
function updateGroup(
  groups: EditorGroup[],
  groupId: string,
  updater: (group: EditorGroup) => EditorGroup
): EditorGroup[] {
  return groups.map((g) => (g.id === groupId ? updater(g) : g));
}

export const useEditorStore = create<EditorState>((set, get) => ({
  groups: [{ id: INITIAL_GROUP_ID, tabs: [], activeTabId: null }],
  activeGroupId: INITIAL_GROUP_ID,
  fileContentCache: new Map(),
  closedTabsStack: [],

  /** ファイルをタブとして開く */
  openFile: async (path, options) => {
    const { groups, activeGroupId } = get();
    const targetGroupId = options?.groupId ?? activeGroupId;
    const group = groups.find((g) => g.id === targetGroupId);
    if (!group) return;

    // 既に開いているタブがあればアクティブにする
    const existingTab = group.tabs.find(
      (t) => t.kind === "file" && t.filePath === path
    );
    if (existingTab) {
      get().setActiveTab(targetGroupId, existingTab.id);
      if (options?.lineNumber !== undefined) {
        set((state) => ({
          groups: updateGroup(state.groups, targetGroupId, (g) => ({
            ...g,
            tabs: g.tabs.map((t) =>
              t.id === existingTab.id
                ? { ...t, cursorLine: options.lineNumber }
                : t
            ),
          })),
        }));
      }
      return;
    }

    // 新規タブを作成
    const newTab: Tab = {
      id: genId(),
      kind: "file",
      title: fileNameFromPath(path),
      filePath: path,
      cursorLine: options?.lineNumber,
    };

    set((state) => ({
      groups: updateGroup(state.groups, targetGroupId, (g) => ({
        ...g,
        tabs: [...g.tabs, newTab],
        activeTabId: newTab.id,
      })),
      activeGroupId: targetGroupId,
    }));

    // バックエンドからファイル内容を取得してキャッシュ
    try {
      const content = await readFile(path);
      set((state) => {
        const next = new Map(state.fileContentCache);
        next.set(path, content);
        return { fileContentCache: next };
      });
    } catch {
      // 読み込みエラーはサイレントに無視（エラー表示は EditorContent で行う）
    }
  },

  /** ウェルカムタブを開く */
  openWelcomeTab: () => {
    const { groups, activeGroupId } = get();
    const group = groups.find((g) => g.id === activeGroupId);
    if (!group) return;

    const existing = group.tabs.find((t) => t.kind === "welcome");
    if (existing) {
      get().setActiveTab(activeGroupId, existing.id);
      return;
    }

    const newTab: Tab = {
      id: genId(),
      kind: "welcome",
      title: "Welcome",
    };

    set((state) => ({
      groups: updateGroup(state.groups, activeGroupId, (g) => ({
        ...g,
        tabs: [newTab, ...g.tabs],
        activeTabId: newTab.id,
      })),
    }));
  },

  /** 検索エディタタブを開く */
  openSearchEditor: (query) => {
    const { activeGroupId } = get();
    const newTab: Tab = {
      id: genId(),
      kind: "search-editor",
      title: query ? `Search: ${query}` : "Search",
      searchQuery: query,
    };

    set((state) => ({
      groups: updateGroup(state.groups, activeGroupId, (g) => ({
        ...g,
        tabs: [...g.tabs, newTab],
        activeTabId: newTab.id,
      })),
    }));
  },

  /** プレーンテキストタブを開く */
  openPlainText: (title, content) => {
    const { activeGroupId } = get();
    const newTab: Tab = {
      id: genId(),
      kind: "plain-text",
      title,
      plainText: content,
    };

    set((state) => ({
      groups: updateGroup(state.groups, activeGroupId, (g) => ({
        ...g,
        tabs: [...g.tabs, newTab],
        activeTabId: newTab.id,
      })),
    }));
  },

  /** タブを閉じる */
  closeTab: (groupId, tabId) => {
    const { groups } = get();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const tabIndex = group.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const closedTab = group.tabs[tabIndex];

    // 次にアクティブにするタブを決定
    let nextActiveTabId: string | null = null;
    if (group.activeTabId === tabId) {
      const remaining = group.tabs.filter((t) => t.id !== tabId);
      if (remaining.length > 0) {
        // 左隣を優先、なければ右隣（先頭だった場合）
        nextActiveTabId =
          tabIndex > 0
            ? remaining[tabIndex - 1].id
            : remaining[0].id;
      }
    } else {
      nextActiveTabId = group.activeTabId;
    }

    set((state) => {
      const prev = state.closedTabsStack;
      const next = [...prev, closedTab].slice(-MAX_CLOSED_TABS);
      return {
        groups: updateGroup(state.groups, groupId, (g) => ({
          ...g,
          tabs: g.tabs.filter((t) => t.id !== tabId),
          activeTabId: nextActiveTabId,
        })),
        closedTabsStack: next,
      };
    });
  },

  /** 指定タブ以外を閉じる */
  closeOtherTabs: (groupId, tabId) => {
    const { groups } = get();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const tabsToClose = group.tabs.filter((t) => t.id !== tabId);

    set((state) => {
      const prev = state.closedTabsStack;
      const next = [...prev, ...tabsToClose].slice(-MAX_CLOSED_TABS);
      return {
        groups: updateGroup(state.groups, groupId, (g) => ({
          ...g,
          tabs: g.tabs.filter((t) => t.id === tabId),
          activeTabId: tabId,
        })),
        closedTabsStack: next,
      };
    });
  },

  /** 指定タブより右を全て閉じる */
  closeTabsToRight: (groupId, tabId) => {
    const { groups } = get();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const tabIndex = group.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const tabsToClose = group.tabs.slice(tabIndex + 1);
    if (tabsToClose.length === 0) return;

    // アクティブタブが右側にある場合は指定タブをアクティブに
    const activeIsToRight = group.activeTabId
      ? tabsToClose.some((t) => t.id === group.activeTabId)
      : false;

    set((state) => {
      const prev = state.closedTabsStack;
      const next = [...prev, ...tabsToClose].slice(-MAX_CLOSED_TABS);
      return {
        groups: updateGroup(state.groups, groupId, (g) => ({
          ...g,
          tabs: g.tabs.slice(0, tabIndex + 1),
          activeTabId: activeIsToRight ? tabId : g.activeTabId,
        })),
        closedTabsStack: next,
      };
    });
  },

  /** グループ内の全タブを閉じる */
  closeAllTabs: (groupId) => {
    const { groups } = get();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    set((state) => {
      const prev = state.closedTabsStack;
      const next = [...prev, ...group.tabs].slice(-MAX_CLOSED_TABS);
      return {
        groups: updateGroup(state.groups, groupId, (g) => ({
          ...g,
          tabs: [],
          activeTabId: null,
        })),
        closedTabsStack: next,
      };
    });
  },

  /** 閉じたタブを再オープン（LIFO） */
  reopenClosedTab: () => {
    const { closedTabsStack, activeGroupId } = get();
    if (closedTabsStack.length === 0) return;

    const tab = closedTabsStack[closedTabsStack.length - 1];

    set((state) => ({
      groups: updateGroup(state.groups, activeGroupId, (g) => ({
        ...g,
        tabs: [...g.tabs, tab],
        activeTabId: tab.id,
      })),
      closedTabsStack: state.closedTabsStack.slice(0, -1),
    }));
  },

  /** タブをアクティブにする */
  setActiveTab: (groupId, tabId) => {
    set((state) => ({
      groups: updateGroup(state.groups, groupId, (g) => ({
        ...g,
        activeTabId: tabId,
      })),
      activeGroupId: groupId,
    }));
  },

  /** タブを移動する（ドラッグ＆ドロップ用） */
  moveTab: (fromGroupId, tabId, toGroupId, toIndex) => {
    const { groups } = get();
    const fromGroup = groups.find((g) => g.id === fromGroupId);
    if (!fromGroup) return;

    const tab = fromGroup.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    set((state) => {
      let updatedGroups = updateGroup(state.groups, fromGroupId, (g) => ({
        ...g,
        tabs: g.tabs.filter((t) => t.id !== tabId),
        activeTabId:
          g.activeTabId === tabId
            ? g.tabs.find((t) => t.id !== tabId)?.id ?? null
            : g.activeTabId,
      }));

      updatedGroups = updateGroup(updatedGroups, toGroupId, (g) => {
        const newTabs = [...g.tabs];
        newTabs.splice(toIndex, 0, tab);
        return { ...g, tabs: newTabs, activeTabId: tabId };
      });

      return { groups: updatedGroups, activeGroupId: toGroupId };
    });
  },

  /** スクロール位置を更新する */
  updateScrollTop: (tabId, scrollTop) => {
    set((state) => ({
      groups: state.groups.map((g) => ({
        ...g,
        tabs: g.tabs.map((t) => (t.id === tabId ? { ...t, scrollTop } : t)),
      })),
    }));
  },

  /** カーソル行を更新する */
  updateCursorLine: (tabId, line) => {
    set((state) => ({
      groups: state.groups.map((g) => ({
        ...g,
        tabs: g.tabs.map((t) =>
          t.id === tabId ? { ...t, cursorLine: line } : t
        ),
      })),
    }));
  },
}));
