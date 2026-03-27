/**
 * exe 統合テストランナー
 * 全テストケースを順次実行し、PASS/FAIL を集計して表示する。
 * 1つでも FAIL があれば exit code 1 で終了する。
 */

import { runAll as runSmoke } from './cases/01_smoke.mjs';
import { runAll as runFilesystem } from './cases/02_filesystem.mjs';
import { runAll as runMultiInstance } from './cases/03_multi_instance.mjs';
import { runAll as runErrorHandling } from './cases/04_error_handling.mjs';
import { runAll as runPerformance } from './cases/05_performance.mjs';

/**
 * 結果サマリーを表示する
 * @param {Array<{id: string, name: string, passed: boolean, message: string}>} allResults
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
      if (r.message) {
        console.log(`           理由: ${r.message}`);
      }
    }
  }

  console.log('========================================\n');
}

async function main() {
  console.log('========================================');
  console.log('  CodeSearch exe 統合テスト');
  console.log('========================================');

  const allResults = [];

  try {
    // 各テストスイートをシリアルに実行する
    const smokeResults = await runSmoke();
    allResults.push(...smokeResults);

    const fsResults = await runFilesystem();
    allResults.push(...fsResults);

    const multiResults = await runMultiInstance();
    allResults.push(...multiResults);

    const errResults = await runErrorHandling();
    allResults.push(...errResults);

    const perfResults = await runPerformance();
    allResults.push(...perfResults);
  } catch (err) {
    console.error('\n予期しないエラーが発生しました:', err.message);
    console.error(err.stack);
    process.exit(1);
  }

  // サマリーを表示する
  printSummary(allResults);

  // 1つでもFAILがあればexit code 1で終了する
  const failCount = allResults.filter(r => !r.passed).length;
  if (failCount > 0) {
    process.exit(1);
  }

  process.exit(0);
}

main();
