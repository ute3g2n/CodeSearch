import React from "react";
import { useEditorStore } from "../../stores/editor";
import { useWorkspaceStore } from "../../stores/workspace";

// インデックス状態を日本語ラベルに変換する
function indexStateLabel(state: string): string {
  switch (state) {
    case "building": return "インデックス構築中";
    case "ready": return "インデックス完了";
    case "error": return "インデックスエラー";
    default: return "インデックス未構築";
  }
}

// ステータスバーコンポーネント
// 左: エンコーディング / 右: インデックス状態
const StatusBar: React.FC = () => {
  const { groups, activeGroupId, fileContentCache } = useEditorStore();
  const { indexStatus } = useWorkspaceStore();

  // アクティブタブのファイルエンコーディングを取得する
  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const activeTab = activeGroup?.tabs.find((t) => t.id === activeGroup.activeTabId);
  const encoding =
    activeTab?.kind === "file" && activeTab.filePath
      ? fileContentCache.get(activeTab.filePath)?.encoding ?? "UTF-8"
      : "UTF-8";

  // アクティブタブのカーソル行番号を取得する
  const cursorLine = activeTab?.cursorLine ?? null;

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
      <div className="status-bar__left" style={{ display: "flex", gap: "12px" }}>
        <span data-testid="status-encoding" className="status-bar__encoding">
          {encoding}
        </span>
        {cursorLine !== null && (
          <span data-testid="status-cursor" className="status-bar__cursor">
            行 {cursorLine + 1}
          </span>
        )}
      </div>

      {/* 右側: インデックス状態 */}
      <div className="status-bar__right">
        <span data-testid="status-index" className="status-bar__index-status">
          {indexStateLabel(indexStatus.state)}
        </span>
      </div>
    </div>
  );
};

export default StatusBar;
