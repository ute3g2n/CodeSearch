import React from "react";

// カスタムタイトルバーコンポーネント
// Tauri の decorations: false に合わせて自前描画
// data-tauri-drag-region 属性でドラッグによるウィンドウ移動を有効化
const TitleBar: React.FC = () => {
  return (
    <div
      className="title-bar"
      data-tauri-drag-region
      style={{
        height: "var(--title-bar-height)",
        backgroundColor: "var(--color-title-bar-bg)",
        color: "var(--color-title-bar-fg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <span>CodeSearch</span>
    </div>
  );
};

export default TitleBar;
