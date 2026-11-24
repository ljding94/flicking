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

## Deploy (Cloudflare Pages)

### One-time KV (room directory)

```bash
npx wrangler login
npx wrangler kv namespace create ROOMS
```

Paste the namespace id into `wrangler.toml` (`id` / `preview_id`), and in the Pages project:

**Settings → Functions → KV namespace bindings** → bind `ROOMS`.

Build settings:

- **Build command:** `npm run build`
- **Build output directory:** `dist`

Or CLI:

```bash
npm run build
npx wrangler pages deploy dist --project-name flicking
```

## Controls

- Drag a piece on your turn to aim (pull back, release to flick).
- `R` — restart match (host / local only).
- Leave table — return to lobby.
