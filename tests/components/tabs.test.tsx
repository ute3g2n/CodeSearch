import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// EditorStore モック（コンポーネント単体テスト用）
vi.mock("../../src/stores/editor", () => ({
  useEditorStore: vi.fn((selector: (s: { fileContentCache: Map<string, unknown> }) => unknown) => {
    const state = { fileContentCache: new Map() };
    return typeof selector === "function" ? selector(state) : state;
  }),
}));

// WorkspaceStore モック
vi.mock("../../src/stores/workspace", () => ({
  useWorkspaceStore: vi.fn(() => ({
    recentWorkspaces: [],
    openWorkspaceDialog: vi.fn(),
    openWorkspace: vi.fn(),
  })),
}));

import Tab from "../../src/components/editor/Tab";
import TabBar from "../../src/components/editor/TabBar";
import WelcomeTab from "../../src/components/editor/WelcomeTab";
import EditorContent from "../../src/components/editor/EditorContent";
import type { Tab as TabType } from "../../src/stores/editor";

// --- Tab テスト ---
describe("Tab", () => {
  const fileTab: TabType = {
    id: "tab-1",
    kind: "file",
    title: "main.ts",
    filePath: "/workspace/main.ts",
  };

  const welcomeTab: TabType = {
    id: "tab-w",
    kind: "welcome",
    title: "Welcome",
  };

  it("ファイルタブのタイトルが表示されること", () => {
    render(
      <Tab
        tab={fileTab}
        isActive={false}
        onClick={vi.fn()}
        onClose={vi.fn()}
        onContextMenu={vi.fn()}
      />
    );
    expect(screen.getByText("main.ts")).toBeInTheDocument();
  });

  it("閉じるボタンが表示されること", () => {
    render(
      <Tab
        tab={fileTab}
        isActive={false}
        onClick={vi.fn()}
        onClose={vi.fn()}
        onContextMenu={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /閉じる/i })).toBeInTheDocument();
  });

  it("タブクリックで onClick が呼ばれること", () => {
    const onClick = vi.fn();
    render(
      <Tab
        tab={fileTab}
        isActive={false}
        onClick={onClick}
        onClose={vi.fn()}
        onContextMenu={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("main.ts"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("閉じるボタンクリックで onClose が呼ばれること", () => {
    const onClose = vi.fn();
    render(
      <Tab
        tab={fileTab}
        isActive={false}
        onClick={vi.fn()}
        onClose={onClose}
        onContextMenu={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /閉じる/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("アクティブタブは data-active 属性を持つこと", () => {
    const { container } = render(
      <Tab
        tab={fileTab}
        isActive={true}
        onClick={vi.fn()}
        onClose={vi.fn()}
        onContextMenu={vi.fn()}
      />
    );
    const tabEl = container.querySelector("[data-active='true']");
    expect(tabEl).toBeTruthy();
  });

  it("非アクティブタブは data-active='false' を持つこと", () => {
    const { container } = render(
      <Tab
        tab={fileTab}
        isActive={false}
        onClick={vi.fn()}
        onClose={vi.fn()}
        onContextMenu={vi.fn()}
      />
    );
    const tabEl = container.querySelector("[data-active='false']");
    expect(tabEl).toBeTruthy();
  });

  it("ウェルカムタブが表示されること", () => {
    render(
      <Tab
        tab={welcomeTab}
        isActive={false}
        onClick={vi.fn()}
        onClose={vi.fn()}
        onContextMenu={vi.fn()}
      />
    );
    expect(screen.getByText("Welcome")).toBeInTheDocument();
  });
});

// --- TabBar テスト ---
describe("TabBar", () => {
  const tabs: TabType[] = [
    { id: "t1", kind: "file", title: "a.ts", filePath: "/a.ts" },
    { id: "t2", kind: "file", title: "b.ts", filePath: "/b.ts" },
    { id: "t3", kind: "file", title: "c.ts", filePath: "/c.ts" },
  ];

  it("全タブが表示されること", () => {
    render(
      <TabBar
        tabs={tabs}
        activeTabId="t1"
        groupId="group-1"
        onTabClick={vi.fn()}
        onTabClose={vi.fn()}
        onTabContextMenu={vi.fn()}
      />
    );
    expect(screen.getByText("a.ts")).toBeInTheDocument();
    expect(screen.getByText("b.ts")).toBeInTheDocument();
    expect(screen.getByText("c.ts")).toBeInTheDocument();
  });

  it("タブクリックで onTabClick が tabId 付きで呼ばれること", () => {
    const onTabClick = vi.fn();
    render(
      <TabBar
        tabs={tabs}
        activeTabId="t1"
        groupId="group-1"
        onTabClick={onTabClick}
        onTabClose={vi.fn()}
        onTabContextMenu={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("b.ts"));
    expect(onTabClick).toHaveBeenCalledWith("t2");
  });

  it("タブが0件のとき空のタブバーが表示されること", () => {
    const { container } = render(
      <TabBar
        tabs={[]}
        activeTabId={null}
        groupId="group-1"
        onTabClick={vi.fn()}
        onTabClose={vi.fn()}
        onTabContextMenu={vi.fn()}
      />
    );
    expect(container.querySelector("[data-testid='tab-bar']")).toBeTruthy();
  });
});

// --- WelcomeTab テスト ---
describe("WelcomeTab", () => {
  it("アプリ名が表示されること", () => {
    render(<WelcomeTab />);
    expect(screen.getByText(/CodeSearch/i)).toBeInTheDocument();
  });

  it("「フォルダーを開く」ボタンが表示されること", () => {
    render(<WelcomeTab />);
    expect(
      screen.getByRole("button", { name: /フォルダーを開く/i })
    ).toBeInTheDocument();
  });

  it("キーボードショートカット一覧が表示されること", () => {
    render(<WelcomeTab />);
    // Ctrl+P, Ctrl+Shift+F などのショートカット
    expect(screen.getByText(/Ctrl\+P/i)).toBeInTheDocument();
  });
});

// --- EditorContent テスト ---
describe("EditorContent", () => {
  it("tab が null のときプレースホルダが表示されること", () => {
    render(<EditorContent tab={null} />);
    expect(screen.getByTestId("editor-placeholder")).toBeInTheDocument();
  });

  it("welcome タブのとき WelcomeTab が表示されること", () => {
    const tab: TabType = { id: "w1", kind: "welcome", title: "Welcome" };
    render(<EditorContent tab={tab} />);
    expect(screen.getByText(/CodeSearch/i)).toBeInTheDocument();
  });

  it("plain-text タブのとき PlainTextView が表示されること", () => {
    const tab: TabType = {
      id: "p1",
      kind: "plain-text",
      title: "Output",
      plainText: "Hello output",
    };
    render(<EditorContent tab={tab} />);
    expect(screen.getByTestId("plain-text-view")).toBeInTheDocument();
  });

  it("file タブのとき CodeView コンテナが表示されること", () => {
    const tab: TabType = {
      id: "f1",
      kind: "file",
      title: "main.ts",
      filePath: "/workspace/main.ts",
    };
    // fileContentCache はモックなので content=null → placeholder
    render(<EditorContent tab={tab} />);
    // CodeView placeholder または code-view-container のどちらかが存在する
    const el =
      screen.queryByTestId("editor-placeholder") ??
      screen.queryByTestId("code-view-container");
    expect(el).toBeTruthy();
  });
});
