import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TitleBar from "../../src/components/layout/TitleBar";
import ActivityBar from "../../src/components/layout/ActivityBar";
import SidebarContainer from "../../src/components/layout/SidebarContainer";
import EditorArea from "../../src/components/layout/EditorArea";
import StatusBar from "../../src/components/layout/StatusBar";
import MainLayout from "../../src/components/layout/MainLayout";

// --- TitleBar ---
describe("TitleBar", () => {
  it("アプリ名が表示されること", () => {
    render(<TitleBar />);
    expect(screen.getByText(/CodeSearch/i)).toBeInTheDocument();
  });

  it("data-tauri-drag-region 属性が設定されていること（ウィンドウドラッグ用）", () => {
    render(<TitleBar />);
    const bar = document.querySelector("[data-tauri-drag-region]");
    expect(bar).not.toBeNull();
  });
});

// --- ActivityBar ---
describe("ActivityBar", () => {
  const defaultProps = {
    activeSidebar: "explorer" as const,
    isSidebarVisible: true,
    onToggle: vi.fn(),
  };

  it("エクスプローラーアイコンと検索アイコンが存在すること", () => {
    render(<ActivityBar {...defaultProps} />);
    expect(screen.getByRole("button", { name: /explorer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  it("アイコンをクリックすると onToggle が呼ばれること", () => {
    const onToggle = vi.fn();
    render(<ActivityBar {...defaultProps} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(onToggle).toHaveBeenCalledWith("search");
  });

  it("activeSidebar に対応するボタンが aria-pressed=true であること", () => {
    render(<ActivityBar {...defaultProps} activeSidebar="explorer" />);
    const explorerBtn = screen.getByRole("button", { name: /explorer/i });
    expect(explorerBtn).toHaveAttribute("aria-pressed", "true");
  });
});

// --- SidebarContainer ---
describe("SidebarContainer", () => {
  it("isVisible=false のとき非表示になること", () => {
    const { container } = render(
      <SidebarContainer activeSidebar="explorer" isVisible={false} width={300} />
    );
    // 幅が0または非表示
    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar).not.toBeNull();
    expect(sidebar.getAttribute("aria-hidden")).toBe("true");
  });

  it("isVisible=true のとき表示されること", () => {
    const { container } = render(
      <SidebarContainer activeSidebar="explorer" isVisible={true} width={300} />
    );
    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar?.getAttribute("aria-hidden")).toBe("false");
  });

  it("activeSidebar='explorer' のとき data-panel='explorer' になること", () => {
    const { container } = render(
      <SidebarContainer activeSidebar="explorer" isVisible={true} width={300} />
    );
    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar?.getAttribute("data-panel")).toBe("explorer");
  });
});

// --- EditorArea ---
describe("EditorArea", () => {
  it("エディタ領域がマウントできること", () => {
    const { container } = render(<EditorArea />);
    expect(container.firstChild).not.toBeNull();
  });

  it("data-testid='editor-area' が存在すること", () => {
    render(<EditorArea />);
    expect(screen.getByTestId("editor-area")).toBeInTheDocument();
  });
});

// --- StatusBar ---
describe("StatusBar", () => {
  it("ステータスバーがマウントできること", () => {
    const { container } = render(<StatusBar />);
    expect(container.firstChild).not.toBeNull();
  });

  it("data-testid='status-bar' が存在すること", () => {
    render(<StatusBar />);
    expect(screen.getByTestId("status-bar")).toBeInTheDocument();
  });
});

// --- MainLayout ---
describe("MainLayout", () => {
  it("ActivityBar・SidebarContainer・EditorArea が含まれること", () => {
    render(<MainLayout />);
    // ActivityBar のボタンが存在
    expect(screen.getByRole("button", { name: /explorer/i })).toBeInTheDocument();
    // EditorArea のテストID が存在
    expect(screen.getByTestId("editor-area")).toBeInTheDocument();
  });

  it("サイドバーの開閉トグルが動作すること", () => {
    render(<MainLayout />);
    const explorerBtn = screen.getByRole("button", { name: /explorer/i });
    // 初期状態: isVisible=true → クリックで閉じる
    fireEvent.click(explorerBtn);
    // もう一度クリックで開く
    fireEvent.click(explorerBtn);
    // クラッシュせず動作することを確認
    expect(explorerBtn).toBeInTheDocument();
  });
});
