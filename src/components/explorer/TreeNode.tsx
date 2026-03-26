import React from "react";
import type { FileNode } from "../../ipc/types";
import { getFileIcon, getFileIconColor, getDirIcon } from "../../utils/fileIcons";

interface TreeNodeProps {
  // ファイル/ディレクトリのノード情報
  node: FileNode;
  // インデント階層（0 から始まる）
  depth: number;
  // ディレクトリが展開中かどうか
  isExpanded: boolean;
  // フォルダクリック時のコールバック
  onToggle: (path: string) => void;
  // ファイルクリック時のコールバック
  onClick: (path: string) => void;
}

// ファイルツリーの1ノードを描画する再帰コンポーネント
// - ファイルクリック → onClick コールバック
// - フォルダクリック → onToggle コールバック
// - インデント: depth * 16px
const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth,
  isExpanded,
  onToggle,
  onClick,
}) => {
  const handleClick = () => {
    if (node.isDir) {
      onToggle(node.path);
    } else {
      onClick(node.path);
    }
  };

  const icon = node.isDir
    ? getDirIcon()
    : getFileIcon(node.extension);

  const iconColor = node.isDir
    ? "#DCB67A"
    : getFileIconColor(node.extension);

  return (
    <div
      className="tree-node"
      style={{
        paddingLeft: `${depth * 16}px`,
        display: "flex",
        alignItems: "center",
        gap: "4px",
        height: "22px",
        cursor: "pointer",
        color: "var(--color-sidebar-fg)",
        fontSize: "13px",
      }}
      onClick={handleClick}
    >
      {/* ディレクトリの展開/折りたたみ矢印 */}
      {node.isDir && (
        <span
          aria-hidden
          role="img"
          style={{
            fontSize: "10px",
            width: "12px",
            display: "inline-block",
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.1s",
            color: "var(--color-sidebar-fg)",
          }}
        >
          ▶
        </span>
      )}

      {/* ファイルアイコン */}
      <span
        role="img"
        aria-hidden
        style={{ fontSize: "14px", color: iconColor }}
      >
        {icon}
      </span>

      {/* ファイル/フォルダ名 */}
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {node.name}
      </span>
    </div>
  );
};

export default TreeNode;
