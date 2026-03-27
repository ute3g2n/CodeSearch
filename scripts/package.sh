#!/usr/bin/env bash
# CodeSearch 配布パッケージ作成スクリプト
# 使用方法: ./scripts/package.sh [version]
# 例: ./scripts/package.sh 0.1.0
set -euo pipefail

VERSION="${1:-$(node -p "require('./package.json').version")}"
DIST_DIR="dist-package"
BUNDLE_DIR="src-tauri/target/release/bundle"

echo "=== CodeSearch ${VERSION} パッケージ作成 ==="

# 1. クリーンビルド
echo "[1/4] フロントエンドビルド..."
npm run build

echo "[2/4] Tauri リリースビルド..."
npm run tauri build

# 2. 出力ディレクトリを用意
rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"

# 3. プラットフォームに応じてバンドルをコピー
OS="$(uname -s)"
case "${OS}" in
  Darwin)
    echo "[3/4] macOS バンドルをコピー..."
    cp -r "${BUNDLE_DIR}/dmg/"*.dmg "${DIST_DIR}/" 2>/dev/null || true
    cp -r "${BUNDLE_DIR}/macos/"*.app "${DIST_DIR}/" 2>/dev/null || true
    ;;
  Linux)
    echo "[3/4] Linux バンドルをコピー..."
    cp "${BUNDLE_DIR}/deb/"*.deb "${DIST_DIR}/" 2>/dev/null || true
    cp "${BUNDLE_DIR}/rpm/"*.rpm "${DIST_DIR}/" 2>/dev/null || true
    cp "${BUNDLE_DIR}/appimage/"*.AppImage "${DIST_DIR}/" 2>/dev/null || true
    ;;
  MINGW*|MSYS*|CYGWIN*)
    echo "[3/4] Windows バンドルをコピー..."
    cp "${BUNDLE_DIR}/msi/"*.msi "${DIST_DIR}/" 2>/dev/null || true
    cp "${BUNDLE_DIR}/nsis/"*.exe "${DIST_DIR}/" 2>/dev/null || true
    ;;
esac

# 4. ZIP アーカイブ作成
echo "[4/4] ZIP アーカイブ作成..."
ARCHIVE_NAME="CodeSearch-${VERSION}-${OS}.zip"
cd "${DIST_DIR}"
zip -r "../${ARCHIVE_NAME}" .
cd ..

echo ""
echo "=== 完了 ==="
echo "出力: ${DIST_DIR}/"
echo "アーカイブ: ${ARCHIVE_NAME}"
ls -lh "${DIST_DIR}/"
