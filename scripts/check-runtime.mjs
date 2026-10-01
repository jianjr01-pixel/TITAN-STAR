#!/usr/bin/env node
// Keep local development close to the GitHub Actions runtime and fail early
// when Excel tooling was not installed.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const major = Number(process.versions.node.split('.')[0]);

if (!Number.isInteger(major) || major < 22 || major >= 25) {
  console.error(`Unsupported Node.js ${process.version}. Use Node.js 22 (CI) or a compatible 22–24 release.`);
  process.exit(1);
}

if (major !== 22) {
  console.warn(`Node.js ${process.version} is compatible, but CI runs Node.js 22. Run verification with Node.js 22 before release.`);
}

try {
  require.resolve('xlsx');
} catch {
  console.error('Missing dependency "xlsx". Run: pnpm install --frozen-lockfile');
  process.exit(1);
}

console.log(`Runtime OK: Node.js ${process.version}; xlsx is installed.`);
