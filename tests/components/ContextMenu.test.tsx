import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ContextMenu from "../../src/components/common/ContextMenu";

const defaultPosition = { x: 100, y: 100 };

const defaultProps = {
  position: defaultPosition,
  onClose: vi.fn(),
  hasSelection: false,
  selectedText: "",
  hasBookmark: false,
  onSearchInSidebar: vi.fn(),
  onSearchInNewEditor: vi.fn(),
  onHighlight: vi.fn(),
  onAddBookmark: vi.fn(),
  onRemoveBookmark: vi.fn(),
};

describe("ContextMenu", () => {
  it("未選択時はコピーが無効化されていること", () => {
    render(<ContextMenu {...defaultProps} hasSelection={false} />);
    const copyItem = screen.getByText("コピー").closest("[role='menuitem']");
    expect(copyItem).toHaveAttribute("aria-disabled", "true");
  });

  it("未選択時は「ブックマークを追加」が表示されること", () => {
    render(<ContextMenu {...defaultProps} hasSelection={false} />);
    expect(screen.getByText("ブックマークを追加")).toBeInTheDocument();
  });

  it("選択時は全メニュー項目が有効化されること", () => {
    render(
      <ContextMenu
        {...defaultProps}
        hasSelection={true}
        selectedText="hello"
      />
    );
    const copyItem = screen.getByText("コピー").closest("[role='menuitem']");
    expect(copyItem).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByText("選択部分を検索")).toBeInTheDocument();
    expect(screen.getByText("選択部分をハイライト")).toBeInTheDocument();
  });

  it("ブックマーク行では「ブックマークを削除」が追加表示されること", () => {
    render(
      <ContextMenu {...defaultProps} hasBookmark={true} />
    );
    expect(screen.getByText("ブックマークを削除")).toBeInTheDocument();
  });

  it("ブックマーク行でない場合「ブックマークを削除」は表示されないこと", () => {
    render(
      <ContextMenu {...defaultProps} hasBookmark={false} />
    );
    expect(screen.queryByText("ブックマークを削除")).not.toBeInTheDocument();
  });

  it("「選択部分をハイライト」クリックで onHighlight が呼ばれること", () => {
    const onHighlight = vi.fn();
    render(
      <ContextMenu
        {...defaultProps}
        hasSelection={true}
        selectedText="hello"
        onHighlight={onHighlight}
      />
    );
    fireEvent.click(screen.getByText("選択部分をハイライト"));
    expect(onHighlight).toHaveBeenCalledWith("hello");
  });
});
