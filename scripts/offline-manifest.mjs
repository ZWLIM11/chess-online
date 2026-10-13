import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root=path.resolve('dist/client');
const assets=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.name.startsWith('.'))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(!['sw.js','offline-assets.json','_headers','_redirects'].includes(entry.name)&&!entry.name.endsWith('.map'))assets.push('/'+path.relative(root,file).replaceAll('\\','/'));}}
await walk(root);
const hash=createHash('sha256');for(const asset of assets.sort()){hash.update(asset);hash.update(await readFile(path.join(root,asset)));}const version=hash.digest('hex').slice(0,12);
await writeFile(path.join(root,'offline-assets.json'),JSON.stringify({version,assets:['/',...assets]}));
console.log(`Offline manifest: ${assets.length} assets`);


