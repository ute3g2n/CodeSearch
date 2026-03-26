import { describe, it, expect, beforeEach, vi } from "vitest";

// IPC モック
vi.mock("../../src/ipc/commands", () => ({
  readFile: vi.fn().mockResolvedValue({
    path: "/workspace/main.ts",
    content: "const x = 1;",
    encoding: "UTF-8",
    lineCount: 1,
    size: 12,
  }),
}));

import { useEditorStore } from "../../src/stores/editor";
import type { Tab } from "../../src/stores/editor";

// --- テストヘルパー ---

/** ストアを初期状態にリセットする */
function resetStore() {
  useEditorStore.setState({
    groups: [
      {
        id: "group-1",
        tabs: [],
        activeTabId: null,
      },
    ],
    activeGroupId: "group-1",
    fileContentCache: new Map(),
    closedTabsStack: [],
  });
}

/** ストア内のタブ一覧を取得（group-1） */
function getTabs(): Tab[] {
  return useEditorStore.getState().groups[0].tabs;
}

/** アクティブタブID を取得（group-1） */
function getActiveTabId(): string | null {
  return useEditorStore.getState().groups[0].activeTabId;
}

// --- openFile テスト ---
describe("EditorStore.openFile", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it("新規ファイルをタブとして開けること", async () => {
    await useEditorStore.getState().openFile("/workspace/main.ts");
    const tabs = getTabs();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].kind).toBe("file");
    expect(tabs[0].filePath).toBe("/workspace/main.ts");
    expect(tabs[0].title).toBe("main.ts");
  });

  it("既に開いているファイルは重複タブを作らずアクティブにすること", async () => {
    await useEditorStore.getState().openFile("/workspace/main.ts");
    await useEditorStore.getState().openFile("/workspace/lib.ts");
    await useEditorStore.getState().openFile("/workspace/main.ts");
    const tabs = getTabs();
    expect(tabs).toHaveLength(2);
    expect(getActiveTabId()).toBe(tabs[0].id);
  });

  it("lineNumber オプション付きで開けること", async () => {
    await useEditorStore.getState().openFile("/workspace/main.ts", { lineNumber: 42 });
    const tabs = getTabs();
    expect(tabs[0].cursorLine).toBe(42);
  });

  it("複数ファイルを順番に開けること", async () => {
    await useEditorStore.getState().openFile("/workspace/a.ts");
    await useEditorStore.getState().openFile("/workspace/b.ts");
    await useEditorStore.getState().openFile("/workspace/c.ts");
    expect(getTabs()).toHaveLength(3);
  });
});

// --- openWelcomeTab テスト ---
describe("EditorStore.openWelcomeTab", () => {
  beforeEach(() => resetStore());

  it("ウェルカムタブを開けること", () => {
    useEditorStore.getState().openWelcomeTab();
    const tabs = getTabs();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].kind).toBe("welcome");
    expect(tabs[0].title).toBe("Welcome");
  });

  it("ウェルカムタブが既存なら重複を作らずアクティブにすること", () => {
    useEditorStore.getState().openWelcomeTab();
    const firstId = getTabs()[0].id;
    useEditorStore.getState().openWelcomeTab();
    expect(getTabs()).toHaveLength(1);
    expect(getActiveTabId()).toBe(firstId);
  });
});

// --- closeTab テスト ---
describe("EditorStore.closeTab", () => {
  beforeEach(() => resetStore());

  it("タブを閉じられること", async () => {
    await useEditorStore.getState().openFile("/workspace/a.ts");
    const tabId = getTabs()[0].id;
    useEditorStore.getState().closeTab("group-1", tabId);
    expect(getTabs()).toHaveLength(0);
    expect(getActiveTabId()).toBeNull();
  });

  it("閉じたタブが closedTabsStack に積まれること", async () => {
    await useEditorStore.getState().openFile("/workspace/a.ts");
    const tabId = getTabs()[0].id;
    useEditorStore.getState().closeTab("group-1", tabId);
    const { closedTabsStack } = useEditorStore.getState();
    expect(closedTabsStack).toHaveLength(1);
    expect(closedTabsStack[0].filePath).toBe("/workspace/a.ts");
  });

  it("アクティブタブを閉じると左隣がアクティブになること", async () => {
    await useEditorStore.getState().openFile("/workspace/a.ts");
    await useEditorStore.getState().openFile("/workspace/b.ts");
    const [tabA, tabB] = getTabs();
    useEditorStore.getState().setActiveTab("group-1", tabB.id);
    useEditorStore.getState().closeTab("group-1", tabB.id);
    expect(getActiveTabId()).toBe(tabA.id);
  });

  it("先頭タブを閉じると右隣がアクティブになること", async () => {
    await useEditorStore.getState().openFile("/workspace/a.ts");
    await useEditorStore.getState().openFile("/workspace/b.ts");
    const [tabA, tabB] = getTabs();
    useEditorStore.getState().setActiveTab("group-1", tabA.id);
    useEditorStore.getState().closeTab("group-1", tabA.id);
    expect(getActiveTabId()).toBe(tabB.id);
  });

  it("closedTabsStack が 20件を超えた場合は古いものが捨てられること", async () => {
    // 21タブを開いて全て閉じる
    for (let i = 0; i < 21; i++) {
      await useEditorStore.getState().openFile(`/workspace/file${i}.ts`);
    }
    const tabs = getTabs();
    for (const tab of tabs) {
      useEditorStore.getState().closeTab("group-1", tab.id);
    }
    const { closedTabsStack } = useEditorStore.getState();
    expect(closedTabsStack.length).toBeLessThanOrEqual(20);
  });
});

// --- closeOtherTabs テスト ---
describe("EditorStore.closeOtherTabs", () => {
  beforeEach(() => resetStore());

  it("指定タブ以外が全て閉じられること", async () => {
    await useEditorStore.getState().openFile("/workspace/a.ts");
    await useEditorStore.getState().openFile("/workspace/b.ts");
    await useEditorStore.getState().openFile("/workspace/c.ts");
    const [, tabB] = getTabs();
    useEditorStore.getState().closeOtherTabs("group-1", tabB.id);
    const tabs = getTabs();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe(tabB.id);
  });

  it("指定タブがアクティブになること", async () => {
    await useEditorStore.getState().openFile("/workspace/a.ts");
    await useEditorStore.getState().openFile("/workspace/b.ts");
    const [tabA] = getTabs();
    useEditorStore.getState().closeOtherTabs("group-1", tabA.id);
    expect(getActiveTabId()).toBe(tabA.id);
  });
});

// --- closeTabsToRight テスト ---
describe("EditorStore.closeTabsToRight", () => {
  beforeEach(() => resetStore());

  it("指定タブより右のタブが全て閉じられること", async () => {
    await useEditorStore.getState().openFile("/workspace/a.ts");
    await useEditorStore.getState().openFile("/workspace/b.ts");
    await useEditorStore.getState().openFile("/workspace/c.ts");
    const [tabA] = getTabs();
    useEditorStore.getState().closeTabsToRight("group-1", tabA.id);
    const tabs = getTabs();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe(tabA.id);
  });

  it("末尾タブに対して closeTabsToRight は何もしないこと", async () => {
    await useEditorStore.getState().openFile("/workspace/a.ts");
    await useEditorStore.getState().openFile("/workspace/b.ts");
    const tabs = getTabs();
    const lastTab = tabs[tabs.length - 1];
    useEditorStore.getState().closeTabsToRight("group-1", lastTab.id);
    expect(getTabs()).toHaveLength(2);
  });
});

// --- closeAllTabs テスト ---
describe("EditorStore.closeAllTabs", () => {
  beforeEach(() => resetStore());

  it("全タブが閉じられること", async () => {
    await useEditorStore.getState().openFile("/workspace/a.ts");
    await useEditorStore.getState().openFile("/workspace/b.ts");
    useEditorStore.getState().closeAllTabs("group-1");
    expect(getTabs()).toHaveLength(0);
    expect(getActiveTabId()).toBeNull();
  });

  it("全タブが closedTabsStack に積まれること", async () => {
    await useEditorStore.getState().openFile("/workspace/a.ts");
    await useEditorStore.getState().openFile("/workspace/b.ts");
    useEditorStore.getState().closeAllTabs("group-1");
    const { closedTabsStack } = useEditorStore.getState();
    expect(closedTabsStack.length).toBeGreaterThanOrEqual(2);
  });
});

// --- reopenClosedTab テスト ---
describe("EditorStore.reopenClosedTab", () => {
  beforeEach(() => resetStore());

  it("最後に閉じたタブが復元されること（LIFO）", async () => {
    await useEditorStore.getState().openFile("/workspace/a.ts");
    await useEditorStore.getState().openFile("/workspace/b.ts");
    const [tabA, tabB] = getTabs();
    useEditorStore.getState().closeTab("group-1", tabB.id);
    useEditorStore.getState().closeTab("group-1", tabA.id);
    useEditorStore.getState().reopenClosedTab();
    const tabs = getTabs();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].filePath).toBe("/workspace/a.ts");
  });

  it("closedTabsStack が空の場合は何もしないこと", () => {
    expect(() => {
      useEditorStore.getState().reopenClosedTab();
    }).not.toThrow();
    expect(getTabs()).toHaveLength(0);
  });

  it("2回連続で再オープンできること", async () => {
    await useEditorStore.getState().openFile("/workspace/a.ts");
    await useEditorStore.getState().openFile("/workspace/b.ts");
    const [tabA, tabB] = getTabs();
    useEditorStore.getState().closeTab("group-1", tabA.id);
    useEditorStore.getState().closeTab("group-1", tabB.id);
    useEditorStore.getState().reopenClosedTab();
    useEditorStore.getState().reopenClosedTab();
    expect(getTabs()).toHaveLength(2);
  });
});

// --- setActiveTab テスト ---
describe("EditorStore.setActiveTab", () => {
  beforeEach(() => resetStore());

  it("指定タブがアクティブになること", async () => {
    await useEditorStore.getState().openFile("/workspace/a.ts");
    await useEditorStore.getState().openFile("/workspace/b.ts");
    const [tabA] = getTabs();
    useEditorStore.getState().setActiveTab("group-1", tabA.id);
    expect(getActiveTabId()).toBe(tabA.id);
  });
});
