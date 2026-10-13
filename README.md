# Arcane Chess

A playable browser chess game built with React, Three.js, chess.js, and Cloudflare D1.

## Features

- Freely rotatable 3D board with silver/blue and black/red fantasy armies.
- Magic, blade, leaping knight, and impact capture effects.
- Easy, Medium, Hard, and Insane local AI; stronger levels search deeper in a background worker. These labels are relative difficulty levels, not an Elo or grandmaster-strength claim.
- Same-screen local play and online two-player room codes/links.
- Castling, en passant, choice of four promotion pieces, checkmate, stalemate, repetition, and material draws.
- Undo for local/AI games and online seat restoration after refresh in the same tab.
- Offline reload and AI play after the first successful online cache installation. Online rooms require a connection.

## Visual scope

The supplied reference image is used as the backdrop. The playable figures are custom procedural models with armor, shields, weapons, crowns, a horse, and a dark dragon-style knight. They are stylized and do not reproduce the reference's photorealistic sculpted characters exactly. Capture sequences are procedural animations, not motion-captured or rigged cinematic executions.

## Run locally

Use Node 22.13 or newer and pnpm 11.25.0:

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_past_alice.sql
pnpm start
```

The production build generates the AI worker and an offline asset manifest. The Sites hosting manifest provisions the D1 binding and migrations on deployment. `pnpm dev` is also available for development after the local database is prepared.

Run the API integration checks against a local server on port 5173:

```sh
node tests/rooms.integration.mjs
```

## Deploy to your own Cloudflare account

Connect this repository's `main` branch to a Cloudflare **Worker** named `chess-online`.

| Setting | Value |
| --- | --- |
| Build command | `pnpm run build:cloudflare` |
| Deploy command | `pnpm run deploy:cloudflare` |
| Root directory | `/` |

No database ID environment variable is required. The deploy command finds the D1 database named `chess-online`, creates it if missing, applies pending migrations, and publishes the Worker and assets. Future deployments reuse that database and preserve rooms. Cloudflare's build token needs Workers and D1 edit permissions. An authorization error must be resolved in the Cloudflare account settings.

Optional overrides: `CLOUDFLARE_WORKER_NAME`, `CLOUDFLARE_D1_DATABASE_NAME`, and `CLOUDFLARE_D1_DATABASE_ID` (to bind an existing database by UUID). Remove empty/example/invalid IDs from previous setup attempts. The default Worker name matches the `chess-online` project shown in the deployment logs.

Use the commands above instead of bare `npx wrangler deploy`, which tries to migrate the Vinext project to OpenNext before a build exists. Build preparation needs no Cloudflare credentials; provisioning happens only in the deploy command.

For local CLI deployment: `pnpm install --frozen-lockfile`, `pnpm exec wrangler login`, then the two commands above. This Cloudflare deployment has its own URL and database; existing Sites rooms are not transferred.

References: [Workers build settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) and [D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/).
## Verification

TypeScript and production build checks pass. Automated tests cover repetition, mate search, legal AI replies, underpromotion, castling, and en passant. Local API integration checks cover simultaneous joins, invalid player tokens, illegal moves, wrong-turn moves, a full checkmate sequence, and token privacy. Browser checks cover a player move, AI reply, undo, camera rotation, and offline reload/AI play with the local server stopped.
