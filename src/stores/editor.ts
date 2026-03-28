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
  /** プレビュータブかどうか（true = イタリック表示、次のファイル選択時に置換される） */
  isPreview?: boolean;
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
  /** 各グループの相対サイズ（合計が groups.length になるように正規化） */
  groupSizes: number[];
  fileContentCache: Map<string, FileContent>;
  /** 閉じたタブのスタック（最大20件）。末尾が最新 */
  closedTabsStack: Tab[];

  // アクション
  openFile: (
    path: string,
    options?: { lineNumber?: number; groupId?: string }
  ) => Promise<void>;
  /** ファイルをプレビュータブとして開く（単一クリック用） */
  openFilePreview: (
    path: string,
    options?: { groupId?: string }
  ) => Promise<void>;
  /** プレビュータブを永続化する（タブヘッダークリック用） */
  confirmPreviewTab: (groupId: string, tabId: string) => void;
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
  /** タブを右に分割して新しいグループに移動する */
  splitRight: (groupId: string, tabId: string) => void;
  /** グループを削除する（最後の1グループは削除不可） */
  removeGroup: (groupId: string) => void;
  /** グループサイズを更新する（SplitHandle ドラッグ用） */
  setGroupSizes: (sizes: number[]) => void;
  updateScrollTop: (tabId: string, scrollTop: number) => void;
  updateCursorLine: (tabId: string, line: number) => void;
  /** エクスプローラービューでハイライトするファイルパス */
  revealedFilePath: string | null;
  /** 指定ファイルをエクスプローラービューでハイライトする */
  revealInExplorer: (path: string) => void;
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
  groupSizes: [1],
  fileContentCache: new Map(),
  closedTabsStack: [],
  revealedFilePath: null,

  /** ファイルをタブとして開く */
  openFile: async (path, options) => {
    const { groups, activeGroupId } = get();
    const targetGroupId = options?.groupId ?? activeGroupId;
    const group = groups.find((g) => g.id === targetGroupId);
    if (!group) return;

    // 既に開いているタブがあればアクティブにする（プレビュータブは永続化する）
    const existingTab = group.tabs.find(
      (t) => t.kind === "file" && t.filePath === path
    );
    if (existingTab) {
      // プレビュータブを永続タブに変換する（ダブルクリック対応）
      if (existingTab.isPreview) {
        set((state) => ({
          groups: updateGroup(state.groups, targetGroupId, (g) => ({
            ...g,
            tabs: g.tabs.map((t) =>
              t.id === existingTab.id ? { ...t, isPreview: false } : t
            ),
            activeTabId: existingTab.id,
          })),
        }));
      } else {
        get().setActiveTab(targetGroupId, existingTab.id);
      }
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

  /** ファイルをプレビュータブとして開く（シングルクリック用） */
  openFilePreview: async (path, options) => {
    const { groups, activeGroupId } = get();
    const targetGroupId = options?.groupId ?? activeGroupId;
    const group = groups.find((g) => g.id === targetGroupId);
    if (!group) return;

    // 既に非プレビューとして開いているタブがあればアクティブにするだけ
    const existingPermanent = group.tabs.find(
      (t) => t.kind === "file" && t.filePath === path && !t.isPreview
    );
    if (existingPermanent) {
      get().setActiveTab(targetGroupId, existingPermanent.id);
      return;
    }

    // 既にプレビューとして同じファイルが開いていればアクティブにするだけ
    const existingPreview = group.tabs.find(
      (t) => t.kind === "file" && t.filePath === path && t.isPreview
    );
    if (existingPreview) {
      get().setActiveTab(targetGroupId, existingPreview.id);
      return;
    }

    // グループ内の既存プレビュータブを探す
    const currentPreviewTab = group.tabs.find((t) => t.isPreview);

    const newTab: Tab = {
      id: currentPreviewTab ? currentPreviewTab.id : genId(),
      kind: "file",
      title: fileNameFromPath(path),
      filePath: path,
      isPreview: true,
    };

    if (currentPreviewTab) {
      // 既存のプレビュータブを置換する
      set((state) => ({
        groups: updateGroup(state.groups, targetGroupId, (g) => ({
          ...g,
          tabs: g.tabs.map((t) =>
            t.id === currentPreviewTab.id ? newTab : t
          ),
          activeTabId: newTab.id,
        })),
        activeGroupId: targetGroupId,
      }));
    } else {
      // 新規プレビュータブを追加する
      set((state) => ({
        groups: updateGroup(state.groups, targetGroupId, (g) => ({
          ...g,
          tabs: [...g.tabs, newTab],
          activeTabId: newTab.id,
        })),
        activeGroupId: targetGroupId,
      }));
    }

    // バックエンドからファイル内容を取得してキャッシュ
    try {
      const content = await readFile(path);
      set((state) => {
        const next = new Map(state.fileContentCache);
        next.set(path, content);
        return { fileContentCache: next };
      });
    } catch {
      // 読み込みエラーはサイレントに無視
    }
  },

  /** プレビュータブを永続タブに変換する（タブクリック用） */
  confirmPreviewTab: (groupId, tabId) => {
    set((state) => ({
      groups: updateGroup(state.groups, groupId, (g) => ({
        ...g,
        tabs: g.tabs.map((t) =>
          t.id === tabId ? { ...t, isPreview: false } : t
        ),
      })),
    }));
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

  /** タブを右に分割して新しいグループに移動する */
  splitRight: (groupId, tabId) => {
    const { groups } = get();
    const groupIndex = groups.findIndex((g) => g.id === groupId);
    if (groupIndex === -1) return;

    const group = groups[groupIndex];
    const tab = group.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    const newGroupId = genId();
    const newGroup: EditorGroup = {
      id: newGroupId,
      tabs: [tab],
      activeTabId: tab.id,
    };

    set((state) => {
      // 元グループからタブを削除
      const updatedGroups = updateGroup(state.groups, groupId, (g) => ({
        ...g,
        tabs: g.tabs.filter((t) => t.id !== tabId),
        activeTabId:
          g.activeTabId === tabId
            ? (g.tabs.find((t) => t.id !== tabId)?.id ?? null)
            : g.activeTabId,
      }));
      // 新グループを元グループの右に挿入
      const nextGroups = [
        ...updatedGroups.slice(0, groupIndex + 1),
        newGroup,
        ...updatedGroups.slice(groupIndex + 1),
      ];
      // サイズを均等に初期化
      const nextSizes = nextGroups.map(() => 1);
      return {
        groups: nextGroups,
        groupSizes: nextSizes,
        activeGroupId: newGroupId,
      };
    });
  },

  /** グループを削除する（最後の1グループは削除不可） */
  removeGroup: (groupId) => {
    const { groups, activeGroupId } = get();
    if (groups.length <= 1) return;

    const removedIndex = groups.findIndex((g) => g.id === groupId);
    if (removedIndex === -1) return;

    set((state) => {
      const nextGroups = state.groups.filter((g) => g.id !== groupId);
      const nextSizes = nextGroups.map(() => 1);
      // アクティブグループが削除された場合は隣のグループをアクティブに
      let nextActiveGroupId = activeGroupId;
      if (activeGroupId === groupId) {
        const newIndex = Math.min(removedIndex, nextGroups.length - 1);
        nextActiveGroupId = nextGroups[newIndex]?.id ?? nextGroups[0].id;
      }
      return {
        groups: nextGroups,
        groupSizes: nextSizes,
        activeGroupId: nextActiveGroupId,
      };
    });
  },

  /** グループサイズを更新する */
  setGroupSizes: (sizes) => {
    set({ groupSizes: sizes });
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

  revealInExplorer: (path) => {
    set({ revealedFilePath: path });
  },
}));
