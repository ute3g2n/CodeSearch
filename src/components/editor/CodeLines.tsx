import React from "react";
import type { TokenSpan } from "../../workers/tokenizer";
import type { HighlightEntry } from "../../stores/highlight";
import { HIGHLIGHT_COLORS } from "../../stores/highlight";

interface CodeLinesProps {
  /// 各行のトークンスパン配列
  spans: TokenSpan[][];
  /// 先頭行の絶対インデックス（0始まり）
  startLine: number;
  /// 選択中の行インデックスセット（0始まり）
  selectedLines: Set<number>;
  /// ハイライトワードエントリ一覧（省略時はハイライトなし）
  highlights?: HighlightEntry[];
}

/// 行内のハイライトマッチ範囲を [start, end][] として返す
function findHighlightRanges(
  text: string,
  entry: HighlightEntry
): [number, number][] {
  const ranges: [number, number][] = [];
  const haystack = entry.ignoreCase ? text.toLowerCase() : text;
  const needle = entry.ignoreCase ? entry.text.toLowerCase() : entry.text;
  if (!needle) return ranges;

  let offset = 0;
  while (offset < haystack.length) {
    const idx = haystack.indexOf(needle, offset);
    if (idx === -1) break;
    ranges.push([idx, idx + needle.length]);
    offset = idx + needle.length;
  }
  return ranges;
}

/// テキストにハイライト背景色を適用して JSX スパン配列を返す
function applyHighlights(
  text: string,
  highlights: HighlightEntry[]
): React.ReactNode {
  if (!highlights.length) return text;

  // 全ハイライトのマッチ範囲を収集して [start, end, colorIndex] に展開
  type Range = { start: number; end: number; color: string };
  const ranges: Range[] = [];

  for (const entry of highlights) {
    const color = HIGHLIGHT_COLORS[entry.colorIndex] ?? "#FF6B6B";
    for (const [s, e] of findHighlightRanges(text, entry)) {
      ranges.push({ start: s, end: e, color });
    }
  }

  if (!ranges.length) return text;

  // 範囲を開始位置でソートして重複を排除しながらテキストを分割する
  ranges.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start < cursor) continue; // 重複はスキップ
    if (range.start > cursor) {
      nodes.push(text.slice(cursor, range.start));
    }
    nodes.push(
      <mark
        key={`hl-${range.start}`}
        style={{
          backgroundColor: range.color,
          color: "#000",
          borderRadius: "2px",
          padding: "0 1px",
        }}
      >
        {text.slice(range.start, range.end)}
      </mark>
    );
    cursor = range.end;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return <>{nodes}</>;
}

/// シンタックスハイライト済みコード行コンポーネント
/// - 各行を TokenSpan の span 要素として描画
/// - 選択行に aria-selected と背景色を適用
/// - HighlightEntry が存在する行にはマーク背景を適用
const CodeLines: React.FC<CodeLinesProps> = ({
  spans,
  startLine,
  selectedLines,
  highlights = [],
}) => {
  return (
    <div
      style={{
        flex: 1,
        overflow: "hidden",
        fontFamily: "monospace",
        fontSize: "13px",
        lineHeight: "20px",
        whiteSpace: "pre",
      }}
    >
      {spans.map((lineSpans, i) => {
        const absoluteIndex = startLine + i;
        const isSelected = selectedLines.has(absoluteIndex);

        // この行の全テキストを結合してハイライト適用の対象とする
        const lineText = lineSpans.map((s) => s.text).join("");
        const hasHighlight = highlights.length > 0 &&
          highlights.some((h) => {
            const hay = h.ignoreCase ? lineText.toLowerCase() : lineText;
            const nee = h.ignoreCase ? h.text.toLowerCase() : h.text;
            return nee.length > 0 && hay.includes(nee);
          });

        return (
          <div
            key={absoluteIndex}
            data-line={absoluteIndex}
            aria-selected={isSelected ? "true" : "false"}
            style={{
              backgroundColor: isSelected
                ? "var(--color-editor-selection, #264f78)"
                : "transparent",
              minHeight: "20px",
            }}
          >
            {hasHighlight
              ? // ハイライトあり: テキスト全体に適用
                applyHighlights(lineText, highlights)
              : // ハイライトなし: トークン色で描画
                lineSpans.map((span, j) => (
                  <span key={j} style={{ color: span.color }}>
                    {span.text}
                  </span>
                ))}
          </div>
        );
      })}
    </div>
  );
};

export default CodeLines;
