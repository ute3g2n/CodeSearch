import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ColorPalette from "../../src/components/common/ColorPalette";

describe("ColorPalette", () => {
  it("15個のカラーチップが表示されること", () => {
    render(<ColorPalette selectedIndex={0} onSelect={vi.fn()} />);
    // 各ボタンは title="色 N" で識別する
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(15);
  });

  it("選択中のインデックスのボタンに白枠ボーダーが付くこと", () => {
    render(<ColorPalette selectedIndex={3} onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    // jsdom は #fff を rgb(255, 255, 255) に正規化する
    expect(buttons[3].getAttribute("style")).toContain("border: 2px solid rgb(255, 255, 255)");
    // 他のボタンは透明ボーダー
    expect(buttons[0].getAttribute("style")).toContain("border: 2px solid transparent");
  });

  it("カラーチップをクリックすると onSelect が呼ばれること", () => {
    const onSelect = vi.fn();
    render(<ColorPalette selectedIndex={0} onSelect={onSelect} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[5]);
    expect(onSelect).toHaveBeenCalledWith(5);
  });
});
