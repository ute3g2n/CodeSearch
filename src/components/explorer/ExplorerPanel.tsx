import React, { useEffect, useState } from "react";
import type { FileNode } from "../../ipc/types";
import { getFileTree } from "../../ipc/commands";
import TreeNode from "./TreeNode";

interface ExplorerPanelProps {
  // 現在のワークスペースパス（null = 未選択）
  workspacePath: string | null;
  // 「フォルダーを開く」クリック時のコールバック
  onOpenWorkspace: () => void;
}

// エクスプローラーパネルコンポーネント
// - ワークスペース未選択: 「フォルダーを開く」ボタンを表示
// - ワークスペース選択済: ファイルツリーを表示（遅延ロード）
const ExplorerPanel: React.FC<ExplorerPanelProps> = ({
  workspacePath,
  onOpenWorkspace,
}) => {
  // ルートレベルのツリーデータ
  const [tree, setTree] = useState<FileNode[]>([]);
  // 読み込み中フラグ
  const [isLoading, setIsLoading] = useState(false);
  // 展開中ディレクトリのパスセット
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  // 展開済みディレクトリの子ノードキャッシュ
  const [childrenCache, setChildrenCache] = useState<
    Record<string, FileNode[]>
  >({});

  // ワークスペースが変わったらツリーを再読み込み
  useEffect(() => {
    if (!workspacePath) {
      setTree([]);
      setExpandedDirs(new Set());
      setChildrenCache({});
      return;
    }

    setIsLoading(true);
    getFileTree(workspacePath, 1)
      .then((nodes) => {
        setTree(nodes);
      })
      .catch((_err) => {
        setTree([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [workspacePath]);

  // フォルダ展開/折りたたみ
  const handleToggle = async (path: string) => {
    const isExpanded = expandedDirs.has(path);

    if (isExpanded) {
      // 折りたたみ
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    } else {
      // 展開: 子ノードをキャッシュから取得 or バックエンドから取得
      setExpandedDirs((prev) => new Set([...prev, path]));

      if (!childrenCache[path]) {
        try {
          const children = await getFileTree(path, 1);
          setChildrenCache((prev) => ({ ...prev, [path]: children }));
        } catch (_err) {
          // エラー時は空リストとして扱う
          setChildrenCache((prev) => ({ ...prev, [path]: [] }));
        }
      }
    }
  };

  // ファイルクリック（後続フェーズで EditorStore と連携）
  const handleFileClick = (_path: string) => {
    // TODO: EditorStore.openFile(path)
  };

  // ノードを再帰描画する
  const renderNode = (node: FileNode, depth: number): React.ReactNode => {
    const isExpanded = expandedDirs.has(node.path);
    const children = childrenCache[node.path] ?? [];

    return (
      <React.Fragment key={node.path}>
        <TreeNode
          node={node}
          depth={depth}
          isExpanded={isExpanded}
          onToggle={handleToggle}
          onClick={handleFileClick}
        />
        {/* 展開中のディレクトリの子ノードを再帰描画 */}
        {node.isDir && isExpanded && children.map((child) => renderNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  // ワークスペース未選択時
  if (!workspacePath) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: "12px",
          padding: "16px",
          color: "var(--color-sidebar-fg)",
        }}
      >
        <p style={{ fontSize: "12px", textAlign: "center", opacity: 0.8 }}>
          フォルダを開いて始めましょう
        </p>
        <button
          onClick={onOpenWorkspace}
          style={{
            padding: "6px 12px",
            backgroundColor: "var(--color-accent)",
            color: "#ffffff",
            borderRadius: "3px",
            fontSize: "13px",
          }}
        >
          フォルダーを開く
        </button>
      </div>
    );
  }

  // ワークスペース選択済み: ファイルツリー表示
  return (
    <div
      data-testid="file-tree"
      style={{
        height: "100%",
        overflow: "auto",
      }}
    >
      {isLoading ? (
        <div
          style={{ padding: "8px", fontSize: "12px", opacity: 0.6 }}
        >
          読み込み中...
        </div>
      ) : (
        tree.map((node) => renderNode(node, 0))
      )}
    </div>
  );
};

export default ExplorerPanel;
