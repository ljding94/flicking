# 强力弹棋

Hotseat / online ice-rink flick chess (web). Original art and names only.

## Play locally

```bash
npm install
npm run dev
```

Local Vite includes an in-memory `/api/rooms` directory (same shape as production).

## Build

```bash
npm run build
```

Static output is in `dist/` (Vite). Cloudflare Pages also serves `functions/`.

## Play online (no login)

1. **创建房间** → share the 4-letter code (or wait for the lobby list).
2. Friend opens the site → **加入** from the list or by code.
3. Host is **red** (first), joiner is **blue**. Extra joiners spectate.

Match sync uses PeerJS (browser P2P). The room **directory** uses Cloudflare Pages + KV.

## Deploy (Cloudflare Worker + assets)

Git / Workers Builds should use:

- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`

Local:

```bash
npm run deploy
```

Room directory uses KV binding `ROOMS` (see `wrangler.toml`). Worker serves `/api/rooms` and static files from `dist/`.

## Controls

- Drag a piece on your turn to aim (pull back, release to flick).
- `R` — restart match (host / local only).
- Leave table — return to lobby.
