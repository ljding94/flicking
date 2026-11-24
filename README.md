# Flicking

Hotseat ice-rink flick chess (web). Inspired by classic Korean/Chinese “power flick” mini-games; original art and names only.

## Play locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Static output is in `dist/` (Vite).

## Deploy (Cloudflare Pages)

1. Push this repo to GitHub.
2. In Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → connect the GitHub repo.
3. Build settings:
   - **Framework preset:** Vite (or None)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Save and deploy. Optionally attach your custom domain under the project’s **Custom domains**.

Or from CLI (after `npx wrangler login`):

```bash
npm run build
npx wrangler pages deploy dist --project-name flicking
```

## Controls

- Drag a piece on your turn to aim (pull back, release to flick).
- `R` — restart match.
