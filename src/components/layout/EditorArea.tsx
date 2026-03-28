// エディタエリアコンポーネント
// 複数の EditorGroup を横に並べて画面分割を実現する
import React from "react";
import { useEditorStore } from "../../stores/editor";
import EditorGroup from "../editor/EditorGroup";
import SplitHandle from "../editor/SplitHandle";

/// EditorGroup の配列をサイズ比に従って横並びに表示するコンテナ
const EditorArea: React.FC = () => {
  const { groups, groupSizes, activeGroupId } = useEditorStore();

  // ファイルD&Dのハンドラ
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain").trim();
    if (!raw) return;
    const paths = raw.split("\n").map((p) => p.trim()).filter(Boolean);
    const store = useEditorStore.getState();
    if (paths.length === 1) {
      // 単一ファイルはプレビュータブで開く
      store.openFilePreview(paths[0]);
    } else {
      // 複数ファイルは通常タブで開く
      paths.forEach((p) => store.openFile(p));
    }
  };

  return (
    <div
      data-testid="editor-area"
      className="editor-area"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        display: "flex",
        flexDirection: "row",
        flex: 1,
        overflow: "hidden",
        minWidth: 0,
        backgroundColor: "var(--color-editor-bg)",
        color: "var(--color-editor-fg)",
      }}
    >
      {groups.map((group, i) => {
        // 各グループの flex 値をサイズ比から設定する
        const flexValue = groupSizes[i] ?? 1;
        return (
          <React.Fragment key={group.id}>
            {/* 先頭以外のグループの前にドラッグハンドルを挿入 */}
            {i > 0 && (
              <SplitHandle leftIndex={i - 1} rightIndex={i} />
            )}
            <div style={{ flex: flexValue, overflow: "hidden", minWidth: 0 }}>
              <EditorGroup
                group={group}
                isActive={group.id === activeGroupId}
              />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default EditorArea;
