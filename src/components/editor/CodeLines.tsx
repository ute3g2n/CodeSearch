import React from "react";
import type { TokenSpan } from "../../workers/tokenizer";

interface CodeLinesProps {
  /// 各行のトークンスパン配列
  spans: TokenSpan[][];
  /// 先頭行の絶対インデックス（0始まり）
  startLine: number;
  /// 選択中の行インデックスセット（0始まり）
  selectedLines: Set<number>;
}

/// シンタックスハイライト済みコード行コンポーネント
/// - 各行を TokenSpan の span 要素として描画
/// - 選択行に aria-selected と背景色を適用
const CodeLines: React.FC<CodeLinesProps> = ({ spans, startLine, selectedLines }) => {
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
            {lineSpans.map((span, j) => (
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
