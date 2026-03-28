#!/usr/bin/env bash
# CodeSearch ポータブル配布パッケージ作成スクリプト
# zip 展開後すぐに実行可能、インストーラー不要
#
# 使用方法: bash scripts/package.sh [version]
# 例:       bash scripts/package.sh 0.1.0
set -euo pipefail

VERSION="${1:-$(node -p "require('./package.json').version")}"
DIST_DIR="dist-package"

echo "=== CodeSearch ${VERSION} ポータブルパッケージ作成 ==="

# 1. クリーンビルド（インストーラー不要なので --no-bundle）
echo "[1/4] フロントエンドビルド..."
npm run build

echo "[2/4] Tauri リリースビルド（バンドルなし）..."
npm run tauri build -- --no-bundle

# 2. 出力ディレクトリを用意
rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"
# data/ ディレクトリを作成（初回起動時に自動生成されるが同梱しておく）
mkdir -p "${DIST_DIR}/data"

# 3. プラットフォームに応じて実行ファイルをコピー
OS="$(uname -s)"
case "${OS}" in
  Darwin)
    echo "[3/4] macOS バイナリをコピー..."
    cp "src-tauri/target/release/codesearch" "${DIST_DIR}/"
    PLATFORM="macOS"
    ;;
  Linux)
    echo "[3/4] Linux バイナリをコピー..."
    cp "src-tauri/target/release/codesearch" "${DIST_DIR}/"
    PLATFORM="Linux"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    echo "[3/4] Windows バイナリをコピー..."
    cp "src-tauri/target/release/codesearch.exe" "${DIST_DIR}/"
    PLATFORM="Windows"
    ;;
  *)
    echo "ERROR: 未対応の OS: ${OS}" >&2
    exit 1
    ;;
esac

# 4. ZIP アーカイブ作成
echo "[4/4] ZIP アーカイブ作成..."
ARCHIVE_NAME="CodeSearch-${VERSION}-${PLATFORM}.zip"
rm -f "${ARCHIVE_NAME}"
case "${OS}" in
  MINGW*|MSYS*|CYGWIN*)
    # Windows: zip コマンドが無い場合は PowerShell を使用
    DIST_WIN="$(cygpath -w "${DIST_DIR}")"
    ARCHIVE_WIN="$(cygpath -w "$(pwd)/${ARCHIVE_NAME}")"
    powershell.exe -Command "Compress-Archive -Path '${DIST_WIN}' -DestinationPath '${ARCHIVE_WIN}' -Force"
    ;;
  *)
    zip -r "${ARCHIVE_NAME}" "${DIST_DIR}"
    ;;
esac

echo ""
echo "=== 完了 ==="
echo "展開後ディレクトリ: ${DIST_DIR}/"
echo "アーカイブ: ${ARCHIVE_NAME}"
ls -lh "${DIST_DIR}/"
