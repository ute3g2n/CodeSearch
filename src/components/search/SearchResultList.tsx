// 検索結果リストコンポーネント（仮想スクロール）
// Virtuoso でファイルグループ→マッチ行を表示する
import React, { useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import type { SearchResultGroup, SearchMatch } from "../../ipc/types";

interface SearchResultListProps {
  groups: SearchResultGroup[];
  onMatchClick: (filePath: string, lineNumber: number) => void;
}

// 表示用のフラット行アイテム（グループヘッダー or マッチ行）
type FlatItem =
  | { kind: "header"; group: SearchResultGroup }
  | { kind: "match"; filePath: string; match: SearchMatch };

// グループリストをフラット化する
function flattenGroups(groups: SearchResultGroup[]): FlatItem[] {
  const items: FlatItem[] = [];
  for (const group of groups) {
    items.push({ kind: "header", group });
    for (const match of group.matches) {
      items.push({ kind: "match", filePath: group.filePath, match });
    }
  }
  return items;
}

// マッチ範囲を元に行テキストをハイライト用スパンに分割する
function renderHighlightedLine(
  line: string,
  ranges: [number, number][]
): React.ReactNode[] {
  if (ranges.length === 0) return [line];

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const [start, end] of ranges) {
    if (cursor < start) {
      nodes.push(
        <span key={`pre-${start}`}>{line.slice(cursor, start)}</span>
      );
    }
    nodes.push(
      <mark
        key={`match-${start}`}
        style={{
          background: "var(--color-accent, #007acc)",
          color: "#ffffff",
          borderRadius: "2px",
          padding: "0 1px",
        }}
      >
        {line.slice(start, end)}
      </mark>
    );
    cursor = end;
  }

  if (cursor < line.length) {
    nodes.push(<span key="tail">{line.slice(cursor)}</span>);
  }

  return nodes;
}

// ファイルグループヘッダー行
const GroupHeader: React.FC<{
  group: SearchResultGroup;
  matchCount: number;
}> = ({ group, matchCount }) => (
  <div
    data-testid="search-result-group"
    style={{
      display: "flex",
      alignItems: "center",
      padding: "4px 8px",
      background: "var(--color-sidebar-section-header, #3c3c3c)",
      borderBottom: "1px solid var(--color-border, #3c3c3c)",
      gap: "6px",
      overflow: "hidden",
      cursor: "default",
      userSelect: "none",
    }}
    title={group.filePath}
  >
    <span
      style={{
        flex: 1,
        fontSize: "11px",
        fontWeight: "bold",
        color: "var(--color-sidebar-fg, #cccccc)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {group.relativePath}
    </span>
    <span
      data-testid="search-result-match-count"
      style={{
        fontSize: "10px",
        color: "var(--color-sidebar-fg, #cccccc)",
        opacity: 0.6,
        flexShrink: 0,
      }}
    >
      {matchCount}件
    </span>
  </div>
);

// マッチ行1行
const MatchRow: React.FC<{
  match: SearchMatch;
  filePath: string;
  onClick: (filePath: string, lineNumber: number) => void;
}> = ({ match, filePath, onClick }) => {
  const handleClick = () => onClick(filePath, match.lineNumber);

  return (
    <div
      data-testid="search-result-match"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      style={{
        display: "flex",
        alignItems: "baseline",
        padding: "2px 8px 2px 20px",
        cursor: "pointer",
        gap: "8px",
        fontSize: "12px",
        lineHeight: 1.5,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "var(--color-list-hover-bg, #2a2d2e)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {/* 行番号 */}
      <span
        style={{
          color: "var(--color-sidebar-fg, #cccccc)",
          opacity: 0.5,
          minWidth: "32px",
          textAlign: "right",
          flexShrink: 0,
          fontFamily: "monospace",
          fontSize: "11px",
        }}
      >
        {match.lineNumber}
      </span>
      {/* 行テキスト（マッチ箇所ハイライト） */}
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: "monospace",
          color: "var(--color-sidebar-fg, #cccccc)",
        }}
      >
        {renderHighlightedLine(match.lineContent.trim(), match.matchRanges)}
      </span>
    </div>
  );
};

// 検索結果リスト本体
const SearchResultList: React.FC<SearchResultListProps> = ({
  groups,
  onMatchClick,
}) => {
  const items = flattenGroups(groups);

  const renderItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item.kind === "header") {
        return (
          <GroupHeader
            group={item.group}
            matchCount={item.group.matches.length}
          />
        );
      }
      return (
        <MatchRow
          match={item.match}
          filePath={item.filePath}
          onClick={onMatchClick}
        />
      );
    },
    [items, onMatchClick]
  );

  if (groups.length === 0) {
    return (
      <div
        style={{
          padding: "16px",
          textAlign: "center",
          color: "var(--color-sidebar-fg, #cccccc)",
          opacity: 0.5,
          fontSize: "12px",
        }}
      >
        結果なし
      </div>
    );
  }

  return (
    <Virtuoso
      style={{ flex: 1 }}
      totalCount={items.length}
      itemContent={renderItem}
    />
  );
};

export default SearchResultList;
