import { build } from 'esbuild';
await build({entryPoints:['lib/ai-worker.ts'],outfile:'public/ai-worker.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
