import React from "react";

// ステータスバーコンポーネント
// 表示項目:
//   左: エンコーディング名（後続フェーズでアクティブファイルと連動）
//   右: インデックス状態、行数/カーソル位置（後続フェーズで実装）
const StatusBar: React.FC = () => {
  return (
    <div
      data-testid="status-bar"
      className="status-bar"
      style={{
        height: "var(--status-bar-height)",
        backgroundColor: "var(--color-status-bar-bg)",
        color: "var(--color-status-bar-fg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingInline: "8px",
        fontSize: "12px",
        flexShrink: 0,
      }}
    >
      {/* 左側: エンコーディング */}
      <div className="status-bar__left">
        <span className="status-bar__encoding">UTF-8</span>
      </div>

      {/* 右側: インデックス状態 */}
      <div className="status-bar__right">
        <span className="status-bar__index-status">インデックス未構築</span>
      </div>
    </div>
  );
};

export default StatusBar;
