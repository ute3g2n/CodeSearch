// ファイル拡張子 → アイコン・カラーマッピング
// VS Code ライクなアイコン表示のための定義

interface IconDef {
  icon: string;
  color: string;
}

// 拡張子別アイコン定義
const ICON_MAP: Record<string, IconDef> = {
  // システム・スクリプト言語
  rs: { icon: "🦀", color: "#CE422B" },
  toml: { icon: "⚙️", color: "#9C4221" },
  lock: { icon: "🔒", color: "#718096" },

  // TypeScript / JavaScript
  ts: { icon: "📘", color: "#3178C6" },
  tsx: { icon: "📘", color: "#3178C6" },
  js: { icon: "📒", color: "#F7DF1E" },
  jsx: { icon: "📒", color: "#F7DF1E" },
  mjs: { icon: "📒", color: "#F7DF1E" },
  cjs: { icon: "📒", color: "#F7DF1E" },

  // Web
  html: { icon: "🌐", color: "#E34F26" },
  htm: { icon: "🌐", color: "#E34F26" },
  css: { icon: "🎨", color: "#264DE4" },
  scss: { icon: "🎨", color: "#CF649A" },
  sass: { icon: "🎨", color: "#CF649A" },
  less: { icon: "🎨", color: "#1D365D" },
  svg: { icon: "🖼️", color: "#FFB13B" },

  // Python
  py: { icon: "🐍", color: "#3776AB" },
  pyi: { icon: "🐍", color: "#3776AB" },
  ipynb: { icon: "📓", color: "#F37726" },

  // Go
  go: { icon: "🐹", color: "#00ADD8" },

  // Java / Kotlin
  java: { icon: "☕", color: "#B07219" },
  kt: { icon: "💜", color: "#7F52FF" },
  kts: { icon: "💜", color: "#7F52FF" },

  // C / C++ / C#
  c: { icon: "🔵", color: "#555555" },
  h: { icon: "🔵", color: "#555555" },
  cpp: { icon: "🔵", color: "#00599C" },
  cc: { icon: "🔵", color: "#00599C" },
  cxx: { icon: "🔵", color: "#00599C" },
  hpp: { icon: "🔵", color: "#00599C" },
  cs: { icon: "🟣", color: "#178600" },

  // Ruby / PHP / Swift
  rb: { icon: "💎", color: "#CC342D" },
  php: { icon: "🐘", color: "#777BB4" },
  swift: { icon: "🧡", color: "#F05138" },

  // Shell / ターミナル
  sh: { icon: "🐚", color: "#89E051" },
  bash: { icon: "🐚", color: "#89E051" },
  zsh: { icon: "🐚", color: "#89E051" },
  bat: { icon: "🪟", color: "#C1F12E" },
  cmd: { icon: "🪟", color: "#C1F12E" },
  ps1: { icon: "🪟", color: "#012456" },

  // データ・設定
  json: { icon: "📋", color: "#CBCB41" },
  yaml: { icon: "📋", color: "#CB171E" },
  yml: { icon: "📋", color: "#CB171E" },
  xml: { icon: "📋", color: "#E37933" },
  csv: { icon: "📊", color: "#89E051" },
  sql: { icon: "🗄️", color: "#336791" },
  env: { icon: "⚙️", color: "#ECD53F" },
  ini: { icon: "⚙️", color: "#6D8086" },
  conf: { icon: "⚙️", color: "#6D8086" },

  // ドキュメント
  md: { icon: "📝", color: "#519ABA" },
  mdx: { icon: "📝", color: "#519ABA" },
  txt: { icon: "📄", color: "#CCCCCC" },
  pdf: { icon: "📕", color: "#E2574C" },
  rst: { icon: "📝", color: "#141413" },

  // 画像
  png: { icon: "🖼️", color: "#A074C4" },
  jpg: { icon: "🖼️", color: "#A074C4" },
  jpeg: { icon: "🖼️", color: "#A074C4" },
  gif: { icon: "🖼️", color: "#A074C4" },
  webp: { icon: "🖼️", color: "#A074C4" },
  ico: { icon: "🖼️", color: "#A074C4" },

  // その他
  gitignore: { icon: "🚫", color: "#F14E32" },
  dockerignore: { icon: "🐳", color: "#2496ED" },
  dockerfile: { icon: "🐳", color: "#2496ED" },
};

// ディレクトリ用アイコン
const DIR_ICON: IconDef = { icon: "📁", color: "#DCB67A" };
// デフォルトファイルアイコン
const DEFAULT_ICON: IconDef = { icon: "📄", color: "#CCCCCC" };

/// ファイル拡張子からアイコン文字列を返す
/// 拡張子がない・不明な場合はデフォルトアイコン（📄）を返す
export function getFileIcon(extension: string | null): string {
  if (!extension) return DEFAULT_ICON.icon;
  return (ICON_MAP[extension.toLowerCase()] ?? DEFAULT_ICON).icon;
}

/// ファイル拡張子からアイコンカラーを返す
export function getFileIconColor(extension: string | null): string {
  if (!extension) return DEFAULT_ICON.color;
  return (ICON_MAP[extension.toLowerCase()] ?? DEFAULT_ICON).color;
}

/// ディレクトリのアイコンを返す
export function getDirIcon(): string {
  return DIR_ICON.icon;
}

/// ディレクトリのアイコンカラーを返す
export function getDirIconColor(): string {
  return DIR_ICON.color;
}
