import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// EditorStore と IPC コマンドをモック
vi.mock("../../src/stores/editor", () => ({
  useEditorStore: vi.fn(() => ({
    closeTab: vi.fn(),
    closeOtherTabs: vi.fn(),
    closeTabsToRight: vi.fn(),
    closeAllTabs: vi.fn(),
    openSearchEditor: vi.fn(),
    splitRight: vi.fn(),
  })),
}));

vi.mock("../../src/ipc/commands", () => ({
  getRelativePath: vi.fn().mockResolvedValue("src/main.ts"),
  revealInOsExplorer: vi.fn(),
}));

import TabContextMenu from "../../src/components/common/TabContextMenu";
import type { Tab } from "../../src/stores/editor";

const defaultPosition = { x: 100, y: 100 };

const fileTab: Tab = {
  id: "tab-1",
  kind: "file",
  title: "main.ts",
  filePath: "/workspace/src/main.ts",
};

const searchTab: Tab = {
  id: "tab-2",
  kind: "search-editor",
  title: "Search",
  searchQuery: "hello",
};

describe("TabContextMenu - ファイルタブ", () => {
  it("閉じる・その他を閉じる・すべて閉じる が表示されること", () => {
    render(
      <TabContextMenu
        position={defaultPosition}
        tab={fileTab}
        groupId="group-1"
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("閉じる")).toBeInTheDocument();
    expect(screen.getByText("その他を閉じる")).toBeInTheDocument();
    expect(screen.getByText("すべて閉じる")).toBeInTheDocument();
  });

  it("ファイルタブにはパスコピーが表示されること", () => {
    render(
      <TabContextMenu
        position={defaultPosition}
        tab={fileTab}
        groupId="group-1"
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("パスのコピー")).toBeInTheDocument();
    expect(screen.getByText("相対パスをコピー")).toBeInTheDocument();
    expect(screen.getByText("エクスプローラーで表示する")).toBeInTheDocument();
  });
});

describe("TabContextMenu - 検索タブ", () => {
  it("ファイル固有メニュー（パスのコピーなど）が非表示であること", () => {
    render(
      <TabContextMenu
        position={defaultPosition}
        tab={searchTab}
        groupId="group-1"
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText("パスのコピー")).not.toBeInTheDocument();
    expect(screen.queryByText("エクスプローラーで表示する")).not.toBeInTheDocument();
  });

  it("検索タブには「新しい検索ウインドウで検索」が表示されること", () => {
    render(
      <TabContextMenu
        position={defaultPosition}
        tab={searchTab}
        groupId="group-1"
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("新しい検索ウインドウで検索")).toBeInTheDocument();
  });
});
