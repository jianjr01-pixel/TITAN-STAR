#!/usr/bin/env node
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const filter = process.argv[2] || '';
const files = readdirSync('tests')
  .filter(name => name.endsWith('.test.mjs') && name.includes(filter))
  .sort()
  .map(name => `tests/${name}`);

if (!files.length) {
  console.error(`No test files matched "${filter}".`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status === null ? 1 : result.status);
