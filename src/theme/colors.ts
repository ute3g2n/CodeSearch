// ダークテーマ配色定義
// 要件定義書セクション5.2に基づく VS Code Dark+ 準拠カラーパレット

export const colors = {
  // エディタ領域
  editor: {
    bg: "#1e1e1e",
    fg: "#d4d4d4",
  },
  // サイドバー領域
  sidebar: {
    bg: "#252526",
    fg: "#cccccc",
    sectionHeader: "#3c3c3c",
  },
  // アクティビティバー
  activityBar: {
    bg: "#333333",
    fg: "#858585",
    activeFg: "#ffffff",
    activeBorder: "#007acc",
  },
  // タイトルバー
  titleBar: {
    bg: "#3c3c3c",
    fg: "#cccccc",
    inactiveFg: "#999999",
  },
  // ステータスバー
  statusBar: {
    bg: "#007acc",
    fg: "#ffffff",
  },
  // ボーダー・区切り線
  border: "#3c3c3c",
  // アクセントカラー
  accent: "#007acc",
  // 入力フィールド
  input: {
    bg: "#3c3c3c",
    fg: "#cccccc",
    border: "#555555",
    focusBorder: "#007acc",
  },
  // リストアイテム
  list: {
    hoverBg: "#2a2d2e",
    activeBg: "#094771",
    activeFg: "#ffffff",
  },
} as const;

// CSS変数として使用する文字列マッピング
export const cssVars = {
  "--color-editor-bg": colors.editor.bg,
  "--color-editor-fg": colors.editor.fg,
  "--color-sidebar-bg": colors.sidebar.bg,
  "--color-sidebar-fg": colors.sidebar.fg,
  "--color-activity-bar-bg": colors.activityBar.bg,
  "--color-activity-bar-fg": colors.activityBar.fg,
  "--color-activity-bar-active-fg": colors.activityBar.activeFg,
  "--color-activity-bar-active-border": colors.activityBar.activeBorder,
  "--color-title-bar-bg": colors.titleBar.bg,
  "--color-title-bar-fg": colors.titleBar.fg,
  "--color-status-bar-bg": colors.statusBar.bg,
  "--color-status-bar-fg": colors.statusBar.fg,
  "--color-border": colors.border,
  "--color-accent": colors.accent,
  "--color-input-bg": colors.input.bg,
  "--color-input-fg": colors.input.fg,
  "--color-input-border": colors.input.border,
  "--color-list-hover-bg": colors.list.hoverBg,
  "--color-list-active-bg": colors.list.activeBg,
} as const;
