/**
 * tauri-driver テストユーティリティ
 * tauri-driver の起動・停止・W3C WebDriver セッション管理を提供する
 */

import { spawn } from 'child_process';
import { resolve } from 'path';
import os from 'os';

const TAURI_DRIVER = resolve(os.homedir(), '.cargo/bin/tauri-driver.exe');
const MSEDGEDRIVER = resolve(os.homedir(), '.cargo/bin/msedgedriver.exe');

export const DRIVER_PORT = 4444;
const NATIVE_PORT = 4445;

let tauriDriverProcess = null;

/**
 * tauri-driver を起動する
 * @returns {Promise<import('child_process').ChildProcess>}
 */
export async function startTauriDriver() {
  console.log(`  tauri-driver を起動中 (port=${DRIVER_PORT})...`);
  tauriDriverProcess = spawn(TAURI_DRIVER, [
    `--port=${DRIVER_PORT}`,
    `--native-port=${NATIVE_PORT}`,
    `--native-driver=${MSEDGEDRIVER}`,
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  tauriDriverProcess.stderr?.on('data', (chunk) => {
    // tauri-driver の stderr を出力する（デバッグ用）
    process.stderr.write(`[tauri-driver] ${chunk}`);
  });

  // 起動を待機する
  await waitMs(2000);
  console.log('  tauri-driver 起動完了');
  return tauriDriverProcess;
}

/**
 * tauri-driver を停止する
 */
export function stopTauriDriver() {
  if (tauriDriverProcess) {
    tauriDriverProcess.kill();
    tauriDriverProcess = null;
    console.log('  tauri-driver 停止完了');
  }
}

/**
 * 指定ミリ秒待機する
 * @param {number} ms
 */
export function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * W3C WebDriver セッションを作成してアプリを起動する
 * @param {string} appPath - 起動するアプリの絶対パス
 * @returns {Promise<string>} セッションID
 */
export async function createSession(appPath) {
  const response = await fetch(`http://127.0.0.1:${DRIVER_PORT}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capabilities: {
        alwaysMatch: {
          'tauri:options': { application: appPath },
          browserName: 'wry',
        },
      },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`セッション作成失敗 (${response.status}): ${text}`);
  }
  const data = await response.json();
  return data.value.sessionId;
}

/**
 * セッションを終了する
 * @param {string} sessionId
 */
export async function deleteSession(sessionId) {
  try {
    await fetch(`http://127.0.0.1:${DRIVER_PORT}/session/${sessionId}`, {
      method: 'DELETE',
    });
  } catch {
    // セッション終了エラーは無視する
  }
}

/**
 * セッション内で非同期 JavaScript を実行する（最後の引数がコールバック）
 * @param {string} sessionId
 * @param {string} script - arguments[N-1] がコールバック関数
 * @param {any[]} args
 * @returns {Promise<any>}
 */
export async function executeAsyncScript(sessionId, script, args = []) {
  const response = await fetch(`http://127.0.0.1:${DRIVER_PORT}/session/${sessionId}/execute/async`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script, args }),
  });
  const data = await response.json();
  if (data.value && data.value.error) {
    throw new Error(data.value.message || JSON.stringify(data.value));
  }
  return data.value;
}

/**
 * セッション内で同期 JavaScript を実行する
 * @param {string} sessionId
 * @param {string} script
 * @param {any[]} args
 * @returns {Promise<any>}
 */
export async function executeScript(sessionId, script, args = []) {
  const response = await fetch(`http://127.0.0.1:${DRIVER_PORT}/session/${sessionId}/execute/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script, args }),
  });
  const data = await response.json();
  return data.value;
}

/**
 * CSS セレクタで要素を検索する（見つからない場合は null を返す）
 * @param {string} sessionId
 * @param {string} selector
 * @returns {Promise<string|null>} elementId or null
 */
export async function findElement(sessionId, selector) {
  try {
    const response = await fetch(`http://127.0.0.1:${DRIVER_PORT}/session/${sessionId}/element`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ using: 'css selector', value: selector }),
    });
    const data = await response.json();
    if (data.value && !data.value.error) {
      return data.value['element-6066-11e4-a52e-4f735466cecf'] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 要素のテキストを取得する
 * @param {string} sessionId
 * @param {string} elementId
 * @returns {Promise<string>}
 */
export async function getElementText(sessionId, elementId) {
  const response = await fetch(
    `http://127.0.0.1:${DRIVER_PORT}/session/${sessionId}/element/${elementId}/text`
  );
  const data = await response.json();
  return data.value ?? '';
}

/**
 * 指定セレクタの要素が表示されるまでポーリングする
 * @param {string} sessionId
 * @param {string} selector
 * @param {number} timeoutMs
 * @returns {Promise<string|null>} elementId or null (timeout)
 */
export async function waitForElement(sessionId, selector, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const elementId = await findElement(sessionId, selector);
    if (elementId) return elementId;
    await waitMs(300);
  }
  return null;
}
