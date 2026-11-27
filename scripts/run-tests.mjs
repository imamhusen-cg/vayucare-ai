import { spawnSync } from 'node:child_process';

const isWin = process.platform === 'win32';
const vitestCmd = isWin ? 'npx.cmd' : 'npx';

console.log('=== Running Frontend Suite (Vitest) ===');
const frontend = spawnSync(vitestCmd, ['vitest', 'run'], { stdio: 'inherit', shell: isWin });

console.log('\n=== Running Backend Suite (node --test) ===');
const backend = spawnSync(process.execPath, ['--test', 'server/test/api.test.js'], { stdio: 'inherit' });

const exitCode = (frontend.status ?? 1) !== 0 || (backend.status ?? 1) !== 0 ? 1 : 0;
process.exit(exitCode);
