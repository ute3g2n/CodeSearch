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
      {Array.from({ length: totalCount }, (_, i) => (
        <div key={i} data-testid={`virtuoso-item-${i}`}>
          {itemContent(i)}
        </div>
      ))}
    </div>
  ),
}));

import SearchResultList from "../../src/components/search/SearchResultList";
import type { SearchResultGroup } from "../../src/ipc/types";

const mockGroups: SearchResultGroup[] = [
  {
    filePath: "/workspace/main.rs",
    relativePath: "main.rs",
    matches: [
      {
        lineNumber: 1,
        lineContent: "fn main() {}",
        matchRanges: [[3, 7]],
      },
      {
        lineNumber: 5,
        lineContent: "fn helper() {}",
        matchRanges: [[3, 9]],
      },
    ],
  },
  {
    filePath: "/workspace/lib.rs",
    relativePath: "lib.rs",
    matches: [
      {
        lineNumber: 10,
        lineContent: "pub fn api() {}",
        matchRanges: [[7, 10]],
      },
    ],
  },
];

describe("SearchResultList", () => {
  it("グループヘッダー（ファイル名）が表示されること", () => {
    render(
      <SearchResultList groups={mockGroups} onMatchClick={vi.fn()} />
    );
    expect(screen.getByText("main.rs")).toBeInTheDocument();
    expect(screen.getByText("lib.rs")).toBeInTheDocument();
  });

  it("各グループのマッチ件数が表示されること", () => {
    render(
      <SearchResultList groups={mockGroups} onMatchClick={vi.fn()} />
    );
    expect(screen.getByText("2件")).toBeInTheDocument();
    expect(screen.getByText("1件")).toBeInTheDocument();
  });

  it("マッチ行の行番号が表示されること", () => {
    render(
      <SearchResultList groups={mockGroups} onMatchClick={vi.fn()} />
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("マッチ行クリックで onMatchClick が呼ばれること", () => {
    const onMatchClick = vi.fn();
    render(
      <SearchResultList groups={mockGroups} onMatchClick={onMatchClick} />
    );
    // role="button" の最初のマッチ行をクリック
    const matchRows = screen.getAllByRole("button");
    fireEvent.click(matchRows[0]);
    expect(onMatchClick).toHaveBeenCalledWith("/workspace/main.rs", 1);
  });

  it("グループが空の場合「結果なし」が表示されること", () => {
    render(<SearchResultList groups={[]} onMatchClick={vi.fn()} />);
    expect(screen.getByText("結果なし")).toBeInTheDocument();
  });
});
