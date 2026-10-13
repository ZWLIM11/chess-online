import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Resolve by exact name on every clean CI checkout so redeploys reuse rooms.
export function resolveDatabase(run, name) {
  const list = () => JSON.parse(run(['d1', 'list', '--json'], true));
  let database = list().find(db => db.name === name);
  if (!database) {
    run(['d1', 'create', name, '--update-config=false']);
    database = list().find(db => db.name === name);
  }
  if (!database?.uuid) throw new Error(`Could not resolve D1 database ${name}.`);
  return database.uuid;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.chdir(fileURLToPath(new URL('../', import.meta.url)));
  await import('./prepare-cloudflare.mjs');
  const configPath = 'dist/server/wrangler.json';
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const run = (args, capture = false) => {
    const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args, '--config', configPath], {
      env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
      encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Cloudflare ${args.slice(0, 2).join(' ')} failed. Check the error above and your build token's Workers and D1 edit permissions.`);
    return result.stdout;
  };
  const database = config.d1_databases[0];
  if (!database.database_id) {
    database.database_id = resolveDatabase(run, database.database_name);
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  }
  run(['d1', 'migrations', 'apply', 'DB', '--remote']);
  run(['deploy']);
}
