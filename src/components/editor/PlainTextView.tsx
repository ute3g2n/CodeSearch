import React from "react";

interface PlainTextViewProps {
  content: string;
  title?: string;
}

/// プレーンテキスト表示コンポーネント
/// 検索結果テキストなどをそのまま表示する
const PlainTextView: React.FC<PlainTextViewProps> = ({ content }) => {
  return (
    <div
      data-testid="plain-text-view"
      style={{
        height: "100%",
        overflow: "auto",
        backgroundColor: "var(--color-editor-bg, #1e1e1e)",
        color: "var(--color-editor-fg, #d4d4d4)",
        fontFamily: "monospace",
        fontSize: "13px",
        padding: "8px 16px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
    >
      {content}
    </div>
  );
};

export default PlainTextView;
