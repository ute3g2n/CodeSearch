import React from "react";

// エディタエリアコンポーネント
// 後続フェーズで EditorGroup・TabBar・CodeView を実装する
// 現フェーズでは空の表示領域のみ
const EditorArea: React.FC = () => {
  return (
    <div
      data-testid="editor-area"
      className="editor-area"
      style={{
        flex: 1,
        backgroundColor: "var(--color-editor-bg)",
        color: "var(--color-editor-fg)",
        overflow: "hidden",
        minWidth: 0,
      }}
    />
  );
};

export default EditorArea;
