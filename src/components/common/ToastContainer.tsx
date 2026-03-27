// トーストコンテナコンポーネント
// 画面右下にトースト通知を積み上げて表示する
import React from "react";
import Toast from "./Toast";
import { useNotificationStore } from "../../stores/notification";

// トーストコンテナ本体
const ToastContainer: React.FC = () => {
  const notifications = useNotificationStore((s) => s.notifications);

  if (notifications.length === 0) return null;

  return (
    <div
      aria-label="通知エリア"
      style={{
        position: "fixed",
        bottom: "32px", // ステータスバーの上
        right: "16px",
        zIndex: 3000,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      {notifications.map((n) => (
        <div key={n.id} style={{ pointerEvents: "auto" }}>
          <Toast notification={n} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
