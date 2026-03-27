/**
 * exe 統合テスト用ユーティリティ
 * exe の起動・待機・終了・ログ読み取り・ファイル検証を提供する
 */

import { spawn, spawnSync } from 'child_process';
import { readFileSync, existsSync, openSync, readSync, closeSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import os from 'os';

/**
 * exe を spawn（detached）で起動する
 * stdout/stderr を指定ログディレクトリのファイルに書き出す
 *
 * @param {string} exePath - 起動するexeの絶対パス
 * @param {{ cwd?: string, logDir?: string }} options
 * @returns {{ pid: number, stdoutLog: string, stderrLog: string }}
 */
export function launchExe(exePath, options = {}) {
  const cwd = options.cwd || process.cwd();
  const logDir = options.logDir || os.tmpdir();

  // ログディレクトリが存在しない場合は作成する
  mkdirSync(logDir, { recursive: true });

  const timestamp = Date.now();
  const stdoutLog = join(logDir, `codesearch-stdout-${timestamp}.log`);
  const stderrLog = join(logDir, `codesearch-stderr-${timestamp}.log`);

  // ログファイルを事前に初期化しておく
  writeFileSync(stdoutLog, '');
  writeFileSync(stderrLog, '');

  // detached: true で親プロセスから切り離してバックグラウンド起動する
  // stdio: 'pipe' でストリームを受け取り、ファイルへのリダイレクトはNode.jsで行う
  const child = spawn(exePath, [], {
    cwd,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  // stdout/stderrをファイルに蓄積する
  const stdoutChunks = [];
  const stderrChunks = [];

  child.stdout.on('data', (chunk) => {
    stdoutChunks.push(chunk);
    // チャンク受信のたびにファイルへ追記する
    try {
      const current = existsSync(stdoutLog) ? readFileSync(stdoutLog) : Buffer.alloc(0);
      writeFileSync(stdoutLog, Buffer.concat([current, chunk]));
    } catch { /* ファイル書き込みエラーは無視する */ }
  });

  child.stderr.on('data', (chunk) => {
    stderrChunks.push(chunk);
    try {
      const current = existsSync(stderrLog) ? readFileSync(stderrLog) : Buffer.alloc(0);
      writeFileSync(stderrLog, Buffer.concat([current, chunk]));
    } catch { /* ファイル書き込みエラーは無視する */ }
  });

  // 親プロセスが子プロセスを待機しないようにする
  child.unref();

  const pid = child.pid;
  if (!pid) {
    throw new Error(`PIDの取得に失敗しました: exeの起動に失敗した可能性があります`);
  }

  return { pid, stdoutLog, stderrLog };
}

/**
 * 指定ミリ秒待機する
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 指定PIDのプロセスが生存しているか確認する
 * PowerShell の Get-Process でエラーがなければ生存と判定する
 *
 * @param {number} pid
 * @returns {boolean}
 */
export function isAlive(pid) {
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Get-Process -Id ${pid} -ErrorAction Stop | Out-Null`,
    ],
    { encoding: 'utf8', timeout: 5000 }
  );
  return result.status === 0;
}

/**
 * 指定PIDのプロセスを強制終了する
 * @param {number} pid
 */
export function killProcess(pid) {
  spawnSync('taskkill', ['/F', '/PID', String(pid)], {
    encoding: 'utf8',
    timeout: 5000,
  });
  // すでに終了している場合もエラーを無視する
}

/**
 * stderr ログファイルの内容を文字列で返す
 * ファイルが存在しない場合は空文字列を返す
 *
 * @param {string} logPath
 * @returns {string}
 */
export function readStderr(logPath) {
  if (!existsSync(logPath)) {
    return '';
  }
  try {
    return readFileSync(logPath, 'utf8');
  } catch {
    return '';
  }
}

/**
 * ファイルの先頭16バイトで SQLite マジックバイトを確認する
 * SQLite のファイル先頭シグネチャは "SQLite format 3\0"（16バイト）
 *
 * @param {string} filePath
 * @returns {boolean}
 */
export function isSqliteFile(filePath) {
  if (!existsSync(filePath)) {
    return false;
  }
  try {
    const SQLITE_MAGIC = Buffer.from('SQLite format 3\0', 'ascii');
    const buf = Buffer.alloc(16);
    const fd = openSync(filePath, 'r');
    const bytesRead = readSync(fd, buf, 0, 16, 0);
    closeSync(fd);
    if (bytesRead < 16) return false;
    return buf.equals(SQLITE_MAGIC);
  } catch {
    return false;
  }
}

/**
 * ランダムサフィックス付きの一時ディレクトリパスを生成する
 * （実際の作成は呼び出し側が行う）
 *
 * @param {string} prefix
 * @returns {string}
 */
export function makeTempDir(prefix = 'codesearch-test-') {
  return join(os.tmpdir(), `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}`);
}
