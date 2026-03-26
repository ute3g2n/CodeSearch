import React from "react";
import { useWorkspaceStore } from "../../stores/workspace";

// キーボードショートカット一覧
const SHORTCUTS = [
  { key: "Ctrl+P", desc: "ファイルをすばやく開く" },
  { key: "Ctrl+Shift+F", desc: "フォルダー内を検索" },
  { key: "Ctrl+W", desc: "タブを閉じる" },
  { key: "Ctrl+Shift+T", desc: "閉じたタブを再度開く" },
  { key: "Ctrl+Tab", desc: "次のタブへ切り替え" },
];

/// ウェルカムタブコンポーネント（要件定義書 3.11）
/// - アプリ名・バージョン表示
/// - 「フォルダーを開く」ボタン
/// - 最近開いたワークスペース一覧
/// - キーボードショートカット一覧
const WelcomeTab: React.FC = () => {
  const { recentWorkspaces, openWorkspaceDialog, openWorkspace } =
    useWorkspaceStore();

  return (
    <div
      data-testid="welcome-tab"
      style={{
        height: "100%",
        overflow: "auto",
        backgroundColor: "var(--color-editor-bg, #1e1e1e)",
        color: "var(--color-editor-fg, #d4d4d4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 24px",
        gap: "32px",
      }}
    >
      {/* アプリ名・バージョン */}
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: "300",
            margin: "0 0 8px",
            color: "var(--color-editor-fg, #d4d4d4)",
          }}
        >
          CodeSearch
        </h1>
        <p style={{ margin: 0, opacity: 0.5, fontSize: "13px" }}>v0.1.0</p>
      </div>

      {/* フォルダーを開くボタン */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <button
          onClick={openWorkspaceDialog}
          style={{
            padding: "8px 20px",
            backgroundColor: "var(--color-accent, #007acc)",
            color: "#ffffff",
            border: "none",
            borderRadius: "3px",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          フォルダーを開く
        </button>
      </div>

      {/* 最近開いたワークスペース */}
      {recentWorkspaces.length > 0 && (
        <div style={{ width: "100%", maxWidth: "480px" }}>
          <h2
            style={{
              fontSize: "11px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: "0 0 8px",
              opacity: 0.6,
            }}
          >
            最近開いたワークスペース
          </h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {recentWorkspaces.slice(0, 5).map((ws) => (
              <li key={ws.id}>
                <button
                  onClick={() => openWorkspace(ws.path)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    color: "var(--color-accent, #007acc)",
                    cursor: "pointer",
                    padding: "4px 0",
                    fontSize: "13px",
                  }}
                >
                  {ws.name}
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "11px",
                      opacity: 0.5,
                      color: "var(--color-editor-fg, #d4d4d4)",
                    }}
                  >
                    {ws.path}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* キーボードショートカット一覧 */}
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <h2
          style={{
            fontSize: "11px",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 0 8px",
            opacity: 0.6,
          }}
        >
          キーボードショートカット
        </h2>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.key}>
                <td
                  style={{
                    padding: "4px 0",
                    paddingRight: "16px",
                    fontFamily: "monospace",
                    color: "var(--color-accent, #007acc)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.key}
                </td>
                <td style={{ padding: "4px 0", opacity: 0.8 }}>{s.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WelcomeTab;
