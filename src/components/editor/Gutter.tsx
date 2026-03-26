import React from "react";

interface GutterProps {
  /// 表示する行数
  lineCount: number;
  /// 先頭行の絶対行インデックス（0始まり）
  startLine: number;
  /// 選択中の行インデックスセット（0始まり）
  selectedLines: Set<number>;
  /// 行番号クリック時のコールバック（0始まりインデックスを渡す）
  onLineClick: (lineIndex: number) => void;
}

/// 行番号ガターコンポーネント
/// - 行番号は startLine + 1 から表示（1始まり）
/// - 選択行は aria-selected と背景色で強調
const Gutter: React.FC<GutterProps> = ({
  lineCount,
  startLine,
  selectedLines,
  onLineClick,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        minWidth: "48px",
        textAlign: "right",
        padding: "0 8px",
        backgroundColor: "var(--color-editor-bg, #1e1e1e)",
        color: "var(--color-editor-line-number, #858585)",
        fontSize: "13px",
        fontFamily: "monospace",
        lineHeight: "20px",
      }}
    >
      {Array.from({ length: lineCount }, (_, i) => {
        const absoluteIndex = startLine + i;
        const isSelected = selectedLines.has(absoluteIndex);

        return (
          <div
            key={absoluteIndex}
            data-line={absoluteIndex}
            aria-selected={isSelected ? "true" : "false"}
            onClick={() => onLineClick(absoluteIndex)}
            style={{
              cursor: "pointer",
              backgroundColor: isSelected
                ? "var(--color-editor-selection, #264f78)"
                : "transparent",
              color: isSelected
                ? "var(--color-editor-fg, #d4d4d4)"
                : undefined,
            }}
          >
            {absoluteIndex + 1}
          </div>
        );
      })}
    </div>
  );
};

export default Gutter;
