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

Use **Cloudflare Workers** with a **D1 database** for the room API. Connect this repository using branch `main`.

1. Create a D1 database named `arcane-chess` in your Cloudflare account and copy its database UUID.
2. Create/connect a Worker named `arcane-chess` to this GitHub repository.
3. Set these **build environment variables**:
   - `CLOUDFLARE_D1_DATABASE_ID`: your D1 database UUID.
   - `CLOUDFLARE_D1_DATABASE_NAME`: `arcane-chess` (or your actual database name).
   - `CLOUDFLARE_WORKER_NAME`: `arcane-chess` (must match the Worker you created).
   - `NODE_VERSION`: `24.19.0`.
   - `PNPM_VERSION`: `11.25.0`.
4. Set build command: `pnpm run build:cloudflare`.
5. Set deploy command: `pnpm run deploy:cloudflare`.
6. Use repository root `/`. The deploy command applies the SQL migrations and publishes the Worker with its assets. Ensure the build's Cloudflare API token can edit Workers and D1 in this account.

For local CLI deployment, run `pnpm exec wrangler login`, set the same `CLOUDFLARE_*` variables in your shell, then run the build and deploy commands above. A clean checkout first needs `pnpm install --frozen-lockfile`.

The preparation script configures the generated Worker with your own database. It fails if the database ID is missing or still the Sites placeholder. Cloudflare deployment creates a separate database and URL; rooms on the existing Sites URL are not transferred.

References: [Workers build settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) and [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).

## Verification

TypeScript and production build checks pass. Automated tests cover repetition, mate search, legal AI replies, underpromotion, castling, and en passant. Local API integration checks cover simultaneous joins, invalid player tokens, illegal moves, wrong-turn moves, a full checkmate sequence, and token privacy. Browser checks cover a player move, AI reply, undo, camera rotation, and offline reload/AI play with the local server stopped.
