import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HighlightItem from "../../src/components/search/HighlightItem";
import type { HighlightEntry } from "../../src/stores/highlight";

const mockEntry: HighlightEntry = {
  id: "hl-1",
  text: "hello",
  colorIndex: 0,
  ignoreCase: false,
};

const mockEntryIgnoreCase: HighlightEntry = {
  id: "hl-2",
  text: "world",
  colorIndex: 2,
  ignoreCase: true,
};

describe("HighlightItem", () => {
  it("テキストが表示されること", () => {
    render(
      <HighlightItem
        entry={mockEntry}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onContextMenu={vi.fn()}
      />
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("← ボタンクリックで onPrev が呼ばれること", () => {
    const onPrev = vi.fn();
    render(
      <HighlightItem
        entry={mockEntry}
        onNext={vi.fn()}
        onPrev={onPrev}
        onContextMenu={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTitle("前のマッチ（←）"));
    expect(onPrev).toHaveBeenCalledWith("hl-1");
  });

  it("→ ボタンクリックで onNext が呼ばれること", () => {
    const onNext = vi.fn();
    render(
      <HighlightItem
        entry={mockEntry}
        onNext={onNext}
        onPrev={vi.fn()}
        onContextMenu={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTitle("次のマッチ（→）"));
    expect(onNext).toHaveBeenCalledWith("hl-1");
  });

  it("ignoreCase=true のとき Aa バッジが表示されること", () => {
    render(
      <HighlightItem
        entry={mockEntryIgnoreCase}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onContextMenu={vi.fn()}
      />
    );
    expect(screen.getByTitle("大文字小文字を無視")).toBeInTheDocument();
  });

  it("ignoreCase=false のとき Aa バッジが表示されないこと", () => {
    render(
      <HighlightItem
        entry={mockEntry}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onContextMenu={vi.fn()}
      />
    );
    expect(screen.queryByTitle("大文字小文字を無視")).not.toBeInTheDocument();
  });
});
