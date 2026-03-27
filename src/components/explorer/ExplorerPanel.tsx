import React, { useEffect, useState, useCallback } from "react";
import type { FileNode } from "../../ipc/types";
import { getFileTree } from "../../ipc/commands";
import { onFsChanged } from "../../ipc/events";
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
// - fs://changed イベントでツリーを差分更新する
const ExplorerPanel: React.FC<ExplorerPanelProps> = ({
  workspacePath,
  onOpenWorkspace,
}) => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [childrenCache, setChildrenCache] = useState<
    Record<string, FileNode[]>
  >({});

  // ルートツリーを再読み込みする関数
  const reloadTree = useCallback(() => {
    if (!workspacePath) return;
    getFileTree(workspacePath, 1)
      .then((nodes) => setTree(nodes))
      .catch(() => setTree([]));
  }, [workspacePath]);

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
      .then((nodes) => setTree(nodes))
      .catch(() => setTree([]))
      .finally(() => setIsLoading(false));
  }, [workspacePath]);

  // fs://changed イベントでツリーを差分更新する
  useEffect(() => {
    if (!workspacePath) return;

    let unlisten: (() => void) | null = null;

    onFsChanged((payload) => {
      // 変更ファイルの親ディレクトリのキャッシュを無効化して再取得
      const changedPath = payload.filePath;
      const parentDir = changedPath.substring(
        0,
        Math.max(changedPath.lastIndexOf("/"), changedPath.lastIndexOf("\\"))
      );

      // キャッシュを削除して再ロードさせる
      setChildrenCache((prev) => {
        const next = { ...prev };
        delete next[parentDir];
        return next;
      });

      // ルートの子ノードが変わった場合はルートを再読み込み
      if (parentDir === workspacePath) {
        reloadTree();
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [workspacePath, reloadTree]);

  // フォルダ展開/折りたたみ
  const handleToggle = async (path: string) => {
    const isExpanded = expandedDirs.has(path);

    if (isExpanded) {
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    } else {
      setExpandedDirs((prev) => new Set([...prev, path]));
      if (!childrenCache[path]) {
        try {
          const children = await getFileTree(path, 1);
          setChildrenCache((prev) => ({ ...prev, [path]: children }));
        } catch {
          setChildrenCache((prev) => ({ ...prev, [path]: [] }));
        }
      }
    }
  };

  // ファイルクリック（EditorStore と連携）
  const handleFileClick = (_path: string) => {
    // TODO: EditorStore.openFile(path) — 後続フェーズで連携
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
        {node.isDir &&
          isExpanded &&
          children.map((child) => renderNode(child, depth + 1))}
      </React.Fragment>
    );
  };

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

  return (
    <div
      data-testid="file-tree"
      style={{ height: "100%", overflow: "auto" }}
    >
      {isLoading ? (
        <div style={{ padding: "8px", fontSize: "12px", opacity: 0.6 }}>
          読み込み中...
        </div>
      ) : (
        tree.map((node) => renderNode(node, 0))
      )}
    </div>
  );
};

export default ExplorerPanel;
