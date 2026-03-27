/**
 * tauri-driver 統合テストランナー
 * tauri-driver を起動し、全テストケースをシリアルに実行する
 */

import { startTauriDriver, stopTauriDriver } from './helpers.mjs';
import { runAll as runIndexNotification } from './cases/02_index_notification.mjs';

/**
 * サマリーを表示する
 */
function printSummary(allResults) {
  const passed = allResults.filter(r => r.passed);
  const failed = allResults.filter(r => !r.passed);

  console.log('\n========================================');
  console.log('  テスト結果サマリー');
  console.log('========================================');
  console.log(`  合計:  ${allResults.length} テスト`);
  console.log(`  PASS:  ${passed.length}`);
  console.log(`  FAIL:  ${failed.length}`);
  console.log('----------------------------------------');

  if (allResults.length > 0) {
    console.log('\n  各テスト結果:');
    for (const r of allResults) {
      const status = r.passed ? 'PASS' : 'FAIL';
      const suffix = r.message ? ` → ${r.message}` : '';
      console.log(`    [${status}] ${r.id}: ${r.name}${suffix}`);
    }
  }

  if (failed.length > 0) {
    console.log('\n  失敗したテスト:');
    for (const r of failed) {
      console.log(`    [FAIL] ${r.id}: ${r.name}`);
      if (r.message) console.log(`           理由: ${r.message}`);
    }
  }

  console.log('========================================\n');
}

async function main() {
  console.log('========================================');
  console.log('  CodeSearch tauri-driver 統合テスト');
  console.log('========================================');

  try {
    await startTauriDriver();
  } catch (err) {
    console.error('tauri-driver 起動失敗:', err.message);
    process.exit(1);
  }

  const allResults = [];

  try {
    const notifResults = await runIndexNotification();
    allResults.push(...notifResults);
  } catch (err) {
    console.error('\n予期しないエラー:', err.message);
    console.error(err.stack);
  } finally {
    stopTauriDriver();
  }

  printSummary(allResults);

  const failCount = allResults.filter(r => !r.passed).length;
  if (failCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main();
