import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// react-virtuoso をモック（jsdom 環境でのスクロール計算回避）
vi.mock("react-virtuoso", () => ({
  Virtuoso: ({
    totalCount,
    itemContent,
    style,
  }: {
    totalCount: number;
    itemContent: (index: number) => React.ReactNode;
    style?: React.CSSProperties;
  }) => (
    <div data-testid="virtuoso" style={style}>
      {Array.from({ length: Math.min(totalCount, 5) }, (_, i) => (
        <div key={i} data-testid={`virtuoso-item-${i}`}>
          {itemContent(i)}
        </div>
      ))}
    </div>
  ),
}));

import CodeView from "../../src/components/editor/CodeView";
import Gutter from "../../src/components/editor/Gutter";
import CodeLines from "../../src/components/editor/CodeLines";
import Minimap from "../../src/components/editor/Minimap";
import type { TokenSpan } from "../../src/workers/tokenizer";

// --- Gutter テスト ---
describe("Gutter", () => {
  it("行番号を表示すること", () => {
    render(
      <Gutter
        lineCount={5}
        startLine={0}
        selectedLines={new Set()}
        onLineClick={vi.fn()}
      />
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("行番号クリックで onLineClick が呼ばれること", () => {
    const onLineClick = vi.fn();
    render(
      <Gutter
        lineCount={3}
        startLine={0}
        selectedLines={new Set()}
        onLineClick={onLineClick}
      />
    );
    fireEvent.click(screen.getByText("2"));
    expect(onLineClick).toHaveBeenCalledWith(1); // 0-indexed
  });

  it("選択された行が強調表示されること", () => {
    const { container } = render(
      <Gutter
        lineCount={3}
        startLine={0}
        selectedLines={new Set([1])}
        onLineClick={vi.fn()}
      />
    );
    const lineElements = container.querySelectorAll("[data-line]");
    // 2行目 (index=1) が selected クラスまたは aria-selected を持つこと
    const selectedEl = Array.from(lineElements).find(
      (el) => el.getAttribute("data-line") === "1"
    );
    expect(selectedEl).toBeTruthy();
    expect(selectedEl?.getAttribute("aria-selected")).toBe("true");
  });

  it("startLine オフセットが反映されること", () => {
    render(
      <Gutter
        lineCount={3}
        startLine={10}
        selectedLines={new Set()}
        onLineClick={vi.fn()}
      />
    );
    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
  });
});

// --- CodeLines テスト ---
describe("CodeLines", () => {
  const spans: TokenSpan[][] = [
    [{ text: "fn ", color: "#C586C0" }, { text: "main", color: "#DCDCAA" }],
    [{ text: "// comment", color: "#6A9955" }],
    [],
  ];

  it("トークンスパンをレンダリングすること", () => {
    render(<CodeLines spans={spans} startLine={0} selectedLines={new Set()} />);
    // exact: false でトリム後の部分一致を使用
    expect(screen.getByText(/^fn\s*$/, { exact: false })).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("// comment")).toBeInTheDocument();
  });

  it("トークンに適切な色が適用されること", () => {
    const { container } = render(
      <CodeLines spans={spans} startLine={0} selectedLines={new Set()} />
    );
    // span 要素を直接取得して色を確認
    const spans2 = container.querySelectorAll("span");
    const fnSpan = Array.from(spans2).find((el) => el.textContent === "fn ");
    expect(fnSpan).toBeTruthy();
    expect(fnSpan).toHaveStyle({ color: "#C586C0" });
  });

  it("空行が表示されること", () => {
    const { container } = render(
      <CodeLines spans={spans} startLine={0} selectedLines={new Set()} />
    );
    const lines = container.querySelectorAll("[data-line]");
    expect(lines).toHaveLength(3);
  });

  it("選択行が強調表示されること", () => {
    const { container } = render(
      <CodeLines spans={spans} startLine={0} selectedLines={new Set([1])} />
    );
    const selectedLine = container.querySelector("[data-line='1'][aria-selected='true']");
    expect(selectedLine).toBeTruthy();
  });
});

// --- Minimap テスト ---
describe("Minimap", () => {
  it("isVisible=true のときに canvas が表示されること", () => {
    const { container } = render(
      <Minimap
        spans={[]}
        isVisible={true}
        onToggle={vi.fn()}
      />
    );
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeTruthy();
  });

  it("isVisible=false のときに canvas が非表示になること", () => {
    const { container } = render(
      <Minimap
        spans={[]}
        isVisible={false}
        onToggle={vi.fn()}
      />
    );
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeNull();
  });

  it("トグルボタンクリックで onToggle が呼ばれること", () => {
    const onToggle = vi.fn();
    render(
      <Minimap
        spans={[]}
        isVisible={true}
        onToggle={onToggle}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /ミニマップ/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

// --- CodeView 統合テスト ---
describe("CodeView", () => {
  it("コンテンツなし時にプレースホルダが表示されること", () => {
    render(<CodeView content={null} extension={null} />);
    expect(screen.getByTestId("editor-placeholder")).toBeInTheDocument();
  });

  it("コンテンツがある場合にエディタエリアが表示されること", () => {
    render(<CodeView content="const x = 1;" extension="ts" />);
    expect(screen.getByTestId("code-view-container")).toBeInTheDocument();
  });

  it("行番号エリアが表示されること", () => {
    render(<CodeView content="line1\nline2\nline3" extension="ts" />);
    expect(screen.getByTestId("gutter-container")).toBeInTheDocument();
  });

  it("ミニマップトグルボタンが表示されること", () => {
    render(<CodeView content="const x = 1;" extension="ts" />);
    expect(screen.getByRole("button", { name: /ミニマップ/i })).toBeInTheDocument();
  });
});
