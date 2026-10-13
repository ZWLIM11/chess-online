import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
await build({ entryPoints:['tests/battle-animation.test.ts'], bundle:true, platform:'node', format:'cjs', outfile:'.sites-runtime/battle-test.cjs' });
const result=spawnSync(process.execPath,['--test','.sites-runtime/battle-test.cjs'],{stdio:'inherit'});
process.exit(result.status ?? 1);
