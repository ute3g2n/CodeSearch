// エディタエリアコンポーネント
// 複数の EditorGroup を横に並べて画面分割を実現する
import React from "react";
import { useEditorStore } from "../../stores/editor";
import EditorGroup from "../editor/EditorGroup";
import SplitHandle from "../editor/SplitHandle";

/// EditorGroup の配列をサイズ比に従って横並びに表示するコンテナ
const EditorArea: React.FC = () => {
  const { groups, groupSizes, activeGroupId } = useEditorStore();

  return (
    <div
      data-testid="editor-area"
      className="editor-area"
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
