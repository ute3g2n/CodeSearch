import React, { useEffect, useState, useCallback } from "react";
import type { FileNode } from "../../ipc/types";
import { getFileTree, revealInOsExplorer } from "../../ipc/commands";
import { onFsChanged } from "../../ipc/events";
import { useEditorStore } from "../../stores/editor";
import { useWorkspaceStore } from "../../stores/workspace";
import TreeNode from "./TreeNode";

interface TreeContextMenuState {
  x: number;
  y: number;
  node: FileNode;
}

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
  const [treeContextMenu, setTreeContextMenu] = useState<TreeContextMenuState | null>(null);
  // フォルダD&Dのドロップハイライト状態
  const [isDragOver, setIsDragOver] = useState(false);

  // エクスプローラービューでハイライトするファイルパス
  const revealedFilePath = useEditorStore((s) => s.revealedFilePath);

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

  // ファイルシングルクリック: プレビュータブとしてファイルを開く
  const handleFileClick = (path: string) => {
    useEditorStore.getState().openFilePreview(path);
  };

  // ファイルダブルクリック: 永続タブとしてファイルを開く
  const handleFileDblClick = (path: string) => {
    useEditorStore.getState().openFile(path);
  };

  // ノードの右クリックコンテキストメニューを表示する
  const handleNodeContextMenu = (e: React.MouseEvent, node: FileNode) => {
    setTreeContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  // コンテキストメニューを閉じる
  const closeContextMenu = () => setTreeContextMenu(null);

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
          onDoubleClick={handleFileDblClick}
          onContextMenu={handleNodeContextMenu}
          isRevealed={!node.isDir && node.path === revealedFilePath}
        />
        {node.isDir &&
          isExpanded &&
          children.map((child) => renderNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  // フォルダD&Dのハンドラ（ワークスペース未選択時）
  const handleExplorerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleExplorerDragLeave = () => {
    setIsDragOver(false);
  };

  const handleExplorerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const path = e.dataTransfer.getData("text/plain").trim();
    if (path) {
      useWorkspaceStore.getState().openWorkspace(path);
    }
  };

  if (!workspacePath) {
    return (
      <div
        data-testid="explorer-drop-zone"
        onDragOver={handleExplorerDragOver}
        onDragLeave={handleExplorerDragLeave}
        onDrop={handleExplorerDrop}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: "12px",
          padding: "16px",
          color: "var(--color-sidebar-fg)",
          outline: isDragOver ? "2px dashed var(--color-accent, #007acc)" : "none",
          backgroundColor: isDragOver ? "rgba(0,122,204,0.05)" : "transparent",
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
      onClick={closeContextMenu}
    >
      {isLoading ? (
        <div style={{ padding: "8px", fontSize: "12px", opacity: 0.6 }}>
          読み込み中...
        </div>
      ) : (
        tree.map((node) => renderNode(node, 0))
      )}

      {/* エクスプローラーコンテキストメニュー */}
      {treeContextMenu && (
        <div
          data-testid="explorer-context-menu"
          role="menu"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: treeContextMenu.x,
            top: treeContextMenu.y,
            zIndex: 2000,
            background: "var(--color-editor-bg, #1e1e1e)",
            border: "1px solid var(--color-border, #3c3c3c)",
            borderRadius: "4px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            minWidth: "180px",
            padding: "4px 0",
          }}
        >
          {!treeContextMenu.node.isDir && (
            <div
              role="menuitem"
              data-testid="explorer-copy-path"
              onClick={() => {
                navigator.clipboard.writeText(treeContextMenu.node.path);
                closeContextMenu();
              }}
              style={{ padding: "5px 16px", fontSize: "13px", cursor: "pointer", color: "var(--color-editor-fg, #d4d4d4)", userSelect: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-list-active-bg, #094771)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              パスのコピー
            </div>
          )}
          <div
            role="menuitem"
            data-testid="explorer-reveal"
            onClick={() => {
              revealInOsExplorer(treeContextMenu.node.path);
              closeContextMenu();
            }}
            style={{ padding: "5px 16px", fontSize: "13px", cursor: "pointer", color: "var(--color-editor-fg, #d4d4d4)", userSelect: "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-list-active-bg, #094771)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            エクスプローラーで表示
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplorerPanel;
