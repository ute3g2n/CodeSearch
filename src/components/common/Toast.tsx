// トースト通知コンポーネント
// kind に応じた色とアイコンで通知を表示する
// progress 種別はプログレスバー付き
import React from "react";
import type { Notification } from "../../stores/notification";
import { useNotificationStore } from "../../stores/notification";

interface ToastProps {
  notification: Notification;
}

// kind に対応するアクセントカラー
const KIND_COLORS: Record<Notification["kind"], string> = {
  info: "#007acc",
  success: "#4caf50",
  warning: "#ff9800",
  error: "#f44336",
  progress: "#007acc",
};

// kind に対応するアイコン（テキスト）
const KIND_ICONS: Record<Notification["kind"], string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✕",
  progress: "⏳",
};

// トースト本体
const Toast: React.FC<ToastProps> = ({ notification }) => {
  const { remove } = useNotificationStore();
  const color = KIND_COLORS[notification.kind];
  const icon = KIND_ICONS[notification.kind];

  return (
    <div
      data-testid="toast"
      role="alert"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "10px 12px",
        background: "var(--color-editor-bg, #1e1e1e)",
        border: `1px solid ${color}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: "4px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        minWidth: "280px",
        maxWidth: "400px",
        position: "relative",
      }}
    >
      {/* ヘッダー行: アイコン + タイトル + 閉じるボタン */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ color, fontSize: "14px", flexShrink: 0 }}>{icon}</span>
        <span
          style={{
            flex: 1,
            fontSize: "13px",
            fontWeight: "bold",
            color: "var(--color-editor-fg, #d4d4d4)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {notification.title}
        </span>
        <button
          data-testid="toast-close"
          onClick={() => remove(notification.id)}
          aria-label="通知を閉じる"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--color-editor-fg, #d4d4d4)",
            cursor: "pointer",
            fontSize: "14px",
            lineHeight: 1,
            padding: "0 2px",
            opacity: 0.6,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* メッセージ */}
      {notification.message && (
        <div
          style={{
            fontSize: "12px",
            color: "var(--color-editor-fg, #d4d4d4)",
            opacity: 0.8,
            paddingLeft: "22px",
          }}
        >
          {notification.message}
        </div>
      )}

      {/* プログレスバー（progress 種別のみ） */}
      {notification.kind === "progress" && notification.progress !== undefined && (
        <div
          style={{
            height: "3px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "2px",
            overflow: "hidden",
            marginTop: "4px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${notification.progress}%`,
              background: color,
              transition: "width 0.3s ease",
              borderRadius: "2px",
            }}
          />
        </div>
      )}

      {/* アクションボタン */}
      {notification.action && (
        <div style={{ paddingLeft: "22px", marginTop: "2px" }}>
          <button
            onClick={() => {
              notification.action!.onClick();
              remove(notification.id);
            }}
            style={{
              background: "transparent",
              border: `1px solid ${color}`,
              borderRadius: "3px",
              color,
              cursor: "pointer",
              fontSize: "11px",
              padding: "2px 8px",
            }}
          >
            {notification.action.label}
          </button>
        </div>
      )}
    </div>
  );
};

export default Toast;
