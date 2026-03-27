/**
 * T-02-08: インデックス構築完了通知テスト
 * tauri-driver を使ってリリースビルドの exe を起動し、
 * 実際のワークスペースを開いてインデックス構築完了トーストを確認する
 */

import {
  createSession,
  deleteSession,
  executeAsyncScript,
  waitForElement,
  getElementText,
  waitMs,
} from '../helpers.mjs';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXE_PATH = resolve(__dirname, '../../../dist-package/codesearch.exe');

// テスト結果を格納する配列
const results = [];

/**
 * テスト結果を記録するヘルパー
 */
function record(id, name, passed, message = '') {
  results.push({ id, name, passed, message });
  const status = passed ? 'PASS' : 'FAIL';
  const suffix = message ? ` (${message})` : '';
  console.log(`  [${status}] ${id}: ${name}${suffix}`);
}

/**
 * T-02-08: インデックス構築完了通知テスト
 * 実際のワークスペースを開き、インデックス構築が完了して
 * 「インデックス構築完了」トーストが表示されることを確認する
 */
async function testT0208() {
  // テスト用ワークスペースディレクトリを作成する
  const workspaceDir = join(os.tmpdir(), `codesearch-driver-ws-${Date.now()}`);
  mkdirSync(workspaceDir, { recursive: true });

  // インデックス対象のテストファイルを作成する（TypeScript, Markdown, JSON）
  writeFileSync(join(workspaceDir, 'main.ts'), [
    '// CodeSearch driver test file',
    'export function greet(name: string): string {',
    '  return `Hello, ${name}!`;',
    '}',
  ].join('\n'));
  writeFileSync(join(workspaceDir, 'README.md'), [
    '# Driver Test Workspace',
    'This workspace is used for tauri-driver integration testing.',
    'CodeSearch will index these files.',
  ].join('\n'));
  writeFileSync(join(workspaceDir, 'config.json'), JSON.stringify({ name: 'driver-test', version: '1.0.0' }, null, 2));

  let sessionId = null;

  try {
    console.log(`  セッション作成中 (exe: ${EXE_PATH})...`);
    sessionId = await createSession(EXE_PATH);
    console.log(`  セッション ID: ${sessionId}`);

    // アプリの起動完了を待機する（WebView2 の初期化に最大5秒）
    await waitMs(5000);

    // open_workspace IPC コマンドを直接呼び出してワークスペースを開く
    const normalizedPath = workspaceDir.replace(/\\/g, '/');
    console.log(`  ワークスペースを開く: ${normalizedPath}`);

    await executeAsyncScript(sessionId, `
      var path = arguments[0];
      var done = arguments[1];
      if (!window.__TAURI_INTERNALS__) {
        done({ error: '__TAURI_INTERNALS__ が見つかりません' });
        return;
      }
      window.__TAURI_INTERNALS__.invoke('open_workspace', { path: path })
        .then(function(result) { done({ ok: true, result: JSON.stringify(result) }); })
        .catch(function(err) { done({ error: String(err) }); });
    `, [normalizedPath]);

    // インデックス構築完了トーストが表示されるまで最大30秒待機する
    console.log('  インデックス構築完了トーストを待機中...');
    const toastSelector = '[data-testid="toast"]';
    const toastMs = 30000;
    const start = Date.now();
    let toastText = null;

    while (Date.now() - start < toastMs) {
      const elementId = await waitForElement(sessionId, toastSelector, 1000);
      if (elementId) {
        const text = await getElementText(sessionId, elementId);
        // 「インデックス構築完了」が含まれるまで待機する（進捗トーストは除外）
        if (text && text.includes('インデックス構築完了')) {
          toastText = text;
          break;
        }
      }
      await waitMs(500);
    }

    if (!toastText) {
      record('T-02-08', 'インデックス構築完了通知', false,
        `${toastMs / 1000}秒以内に「インデックス構築完了」トーストが表示されなかった`);
    } else {
      record('T-02-08', 'インデックス構築完了通知', true,
        `トーストテキスト: "${toastText.trim()}"`);
    }
  } catch (err) {
    record('T-02-08', 'インデックス構築完了通知', false, err.message);
  } finally {
    if (sessionId) {
      await deleteSession(sessionId).catch(() => {});
    }
    // クリーンアップ
    await waitMs(1000);
    try { rmSync(workspaceDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

/**
 * このファイルのテストをすべて実行してresults配列を返す
 */
export async function runAll() {
  console.log('\n--- driver/02_index_notification.mjs ---');
  await testT0208();
  return results;
}
