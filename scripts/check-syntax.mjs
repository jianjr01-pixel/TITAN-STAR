#!/usr/bin/env node
// 所有網站腳本、建置工具與 Cloudflare Worker 的語法檢查（CI 與本機共用這份清單）。
import { spawnSync } from 'node:child_process';

const files = [
  'parser.js', 'analyzer.js', 'app.js', 'report.js', 'rma.js', 'sw.js',
  'build.js', 'monthly-source.js', 'privacy.js', 'auth-config.js', 'auth-worker.js',
  'worker/src/index.js', 'worker/src/filename.js', 'worker/scripts/create-admin.mjs',
  'scripts/check-source-dir.cjs', 'scripts/build-version.mjs', 'scripts/check-version-anchors.mjs',
  'scripts/check-auth-config.mjs', 'scripts/mask-identifiers.cjs',
];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax OK: ${files.length} files checked.`);
