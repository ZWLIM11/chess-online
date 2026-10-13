import { readFileSync, writeFileSync } from 'node:fs';

// Run after building, when deploying to your own Cloudflare account.
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID?.trim();
const databaseName = process.env.CLOUDFLARE_D1_DATABASE_NAME?.trim() || 'arcane-chess';
const workerName = process.env.CLOUDFLARE_WORKER_NAME?.trim() || 'arcane-chess';
if (!databaseId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(databaseId)
    || databaseId === '00000000-0000-4000-8000-000000000000') {
  throw new Error('Set CLOUDFLARE_D1_DATABASE_ID to the ID of your own D1 database.');
}
if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(workerName)) {
  throw new Error('CLOUDFLARE_WORKER_NAME must be a lowercase Worker name (letters, digits, hyphens).');
}
const configPath = new URL('../dist/server/wrangler.json', import.meta.url);
const config = JSON.parse(readFileSync(configPath, 'utf8'));
config.name = workerName;
config.topLevelName = workerName;
config.workers_dev = true;
config.d1_databases = [{
  binding: 'DB', database_name: databaseName, database_id: databaseId,
  migrations_dir: '../../drizzle',
}];
writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log(`Prepared ${workerName} with D1 binding DB. No resources have been deployed.`);
