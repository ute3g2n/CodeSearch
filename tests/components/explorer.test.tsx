import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ExplorerPanel from "../../src/components/explorer/ExplorerPanel";
import TreeNode from "../../src/components/explorer/TreeNode";
import { getFileIcon, getFileIconColor } from "../../src/utils/fileIcons";
import type { FileNode } from "../../src/ipc/types";

// IPC モック（テスト環境ではバックエンドが存在しない）
vi.mock("../../src/ipc/commands", () => ({
  getFileTree: vi.fn(() => Promise.resolve([])),
}));

// --- fileIcons テスト ---
describe("fileIcons", () => {
  it("Rustファイルのアイコンを返せること", () => {
    expect(getFileIcon("rs")).toBe("🦀");
  });

  it("TypeScriptファイルのアイコンを返せること", () => {
    expect(getFileIcon("ts")).toBe("📘");
  });

  it("不明な拡張子はデフォルトアイコンを返すこと", () => {
    expect(getFileIcon("xyz_unknown_ext")).toBe("📄");
  });

  it("nullはデフォルトアイコンを返すこと", () => {
    expect(getFileIcon(null)).toBe("📄");
  });

  it("アイコンカラーを返せること", () => {
    const color = getFileIconColor("ts");
    expect(typeof color).toBe("string");
    expect(color.startsWith("#")).toBe(true);
  });
});

// --- ExplorerPanel テスト ---
describe("ExplorerPanel", () => {
  it("ワークスペース未選択時は「フォルダーを開く」ボタンが表示されること", () => {
    render(<ExplorerPanel workspacePath={null} onOpenWorkspace={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /フォルダーを開く/i })
    ).toBeInTheDocument();
  });

  it("「フォルダーを開く」クリックで onOpenWorkspace が呼ばれること", () => {
    const onOpen = vi.fn();
    render(<ExplorerPanel workspacePath={null} onOpenWorkspace={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: /フォルダーを開く/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("ワークスペース選択時はファイルツリーエリアが表示されること", () => {
    render(
      <ExplorerPanel workspacePath="/test/workspace" onOpenWorkspace={vi.fn()} />
    );
    expect(screen.getByTestId("file-tree")).toBeInTheDocument();
  });

  it("ワークスペース選択時は「フォルダーを開く」ボタンが非表示であること", () => {
    render(
      <ExplorerPanel workspacePath="/test/workspace" onOpenWorkspace={vi.fn()} />
    );
    expect(
      screen.queryByRole("button", { name: /フォルダーを開く/i })
    ).toBeNull();
  });
});

// --- TreeNode テスト ---
describe("TreeNode", () => {
  const fileNode: FileNode = {
    name: "main.rs",
    path: "/workspace/src/main.rs",
    isDir: false,
    children: null,
    extension: "rs",
    size: 1024,
  };

  const dirNode: FileNode = {
    name: "src",
    path: "/workspace/src",
    isDir: true,
    children: null,
    extension: null,
    size: 0,
  };

  it("ファイルノードが表示されること", () => {
    render(
      <TreeNode
        node={fileNode}
        depth={0}
        isExpanded={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText("main.rs")).toBeInTheDocument();
  });

  it("ファイルクリックで onClick が呼ばれること", () => {
    const onClick = vi.fn();
    render(
      <TreeNode
        node={fileNode}
        depth={0}
        isExpanded={false}
        onToggle={vi.fn()}
        onClick={onClick}
      />
    );
    fireEvent.click(screen.getByText("main.rs"));
    expect(onClick).toHaveBeenCalledWith(fileNode.path);
  });

  it("フォルダクリックで onToggle が呼ばれること", () => {
    const onToggle = vi.fn();
    render(
      <TreeNode
        node={dirNode}
        depth={0}
        isExpanded={false}
        onToggle={onToggle}
        onClick={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("src"));
    expect(onToggle).toHaveBeenCalledWith(dirNode.path);
  });

  it("depth に応じてインデントが適用されること", () => {
    const { container } = render(
      <TreeNode
        node={fileNode}
        depth={2}
        isExpanded={false}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    const item = container.firstChild as HTMLElement;
    const style = item?.style?.paddingLeft ?? "";
    // depth=2 → paddingLeft = 32px
    expect(style).toContain("32px");
  });

  it("フォルダが展開中の場合、展開矢印アイコンが回転していること", () => {
    const { container } = render(
      <TreeNode
        node={dirNode}
        depth={0}
        isExpanded={true}
        onToggle={vi.fn()}
        onClick={vi.fn()}
      />
    );
    // 展開時は矢印が rotate(90deg) になる
    const arrow = container.querySelector("span[aria-hidden]");
    expect(arrow).not.toBeNull();
    expect(arrow?.textContent).toBe("▶");
  });
});
