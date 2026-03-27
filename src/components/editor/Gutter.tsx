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
  /// ブックマークが設定されている行インデックスセット（0始まり）
  bookmarkedLines?: Set<number>;
  /// 行インデックス → ブックマーク色 hex のマップ
  bookmarkColors?: Map<number, string>;
}

/// 行番号ガターコンポーネント
/// - 行番号は startLine + 1 から表示（1始まり）
/// - 選択行は aria-selected と背景色で強調
/// - ブックマーク行には色付き丸ドットを表示
const Gutter: React.FC<GutterProps> = ({
  lineCount,
  startLine,
  selectedLines,
  onLineClick,
  bookmarkedLines,
  bookmarkColors,
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
        const hasBookmark = bookmarkedLines?.has(absoluteIndex) ?? false;
        const bookmarkColor = bookmarkColors?.get(absoluteIndex);

        return (
          <div
            key={absoluteIndex}
            data-line={absoluteIndex}
            aria-selected={isSelected ? "true" : "false"}
            onClick={() => onLineClick(absoluteIndex)}
            style={{
              position: "relative",
              cursor: "pointer",
              backgroundColor: isSelected
                ? "var(--color-editor-selection, #264f78)"
                : "transparent",
              color: isSelected
                ? "var(--color-editor-fg, #d4d4d4)"
                : undefined,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "4px",
            }}
          >
            {/* ブックマークドット */}
            {hasBookmark && (
              <span
                aria-label="bookmark"
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: bookmarkColor ?? "#E53935",
                  flexShrink: 0,
                }}
              />
            )}
            {absoluteIndex + 1}
          </div>
        );
      })}
    </div>
  );
};

export default Gutter;
