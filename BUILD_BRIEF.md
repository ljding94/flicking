# Flicking — Build Brief (from design session)

Build agent: implement this. Design session continues high-level discussion separately; treat this file as the source of truth until revised.

**Visual direction (approved):** see `docs/VISUAL_BRIEF.md` and reference stills in `docs/refs/` (study only — do not ship copyrighted sprites).

**Physics feel (approved):** see `docs/PHYSICS_BRIEF.md`. Keep Matter.js; restitution ~0.85–0.90; retune `frictionAir` / `maxSpeed` so full-power solo slide ≈ **0.9–1.1× ice length**.

## Goal

Web clone of the ice-surface flick-chess from Sina iGame / 野菜部落 (空雅强力弹棋), with **original** art/names (no 空雅 / 野菜部落 trademarks). Local two-player first → GitHub → Cloudflare Pages.

## Stack

- Vite + TypeScript + Canvas 2D + `matter-js`
- Static `dist` for Cloudflare Pages
- v1: same-device hotseat only (no netcode, no AI)

## Core rules

- Two sides: `red` (bottom) / `blue` (top). Turn-based.
- On your turn: flick **one** of your alive pieces, or (items mode) use one item.
- Aim: press piece, drag **away** from desired direction; release. Direction = from pointer toward piece. Power = clamp(dragDist / maxDrag, 0, 1).
- Pieces collide with each other. Static bumpers optional (currently none — open ice).
- Piece **center** outside ice rect → ejected (`alive = false`).
- All pieces stop → resolve ejections → win check → next turn.
- 20s turn timer; timeout = skip turn.
- Win: opponent has 0 alive pieces. If same shot ejects both last pieces, active player wins.

## Board (current playable)

Portrait canvas **720 × 960** (~3:4). Ice inset with table/water margin:

`ice = { x: 48, y: 56, w: 624, h: 856 }`

Opening armies sit **inset** from the ice rim (side + back padding) so first shots cannot casually shove a back-row piece off.

Nine files x ≈ `160, 210, …, 560`. Red ranks (approx): back `y≈790`, cannons `≈700`, pawns `≈610`. Blue = mirror.

## Pieces

| Tier | Roles | Count/side | Radius | Mass |
|------|-------|------------|--------|------|
| small | pawn | 5 | 11 | 1 |
| medium | horse, elephant, advisor, cannon | 8 | 15 | 3 |
| large | chariot | 2 | 18 | 5.5 |
| anchor | general | 1 | 21 | 9 |

Mass is set explicitly via `Body.setMass` (not density≈area). Inertia locked so collisions stay mass-driven.

Visual: **white puck + chibi face** (warm coral / cool ice), tiny role badge on rim — not flat 象棋 discs. See `docs/VISUAL_BRIEF.md`.

## Items mode (optional; classic = off)

Per-side meter 0–100. Each ejection during your turn (any side’s piece) adds `meterPerEject` (18). Thresholds unlock and **stack**; using any one clears the whole bar:

| Meter | Id | Effect |
|------:|----|--------|
| 25 | rage | Next flick power ×1.65; aim ring red |
| 50 | morph | Small → medium if you already lost ≥1 medium; that piece may flick immediately (turn continues) |
| 75 | blink | Place one own piece on ice (no overlap); ends turn |
| 100 | nova | Radial impulse from one own piece (radius 130); ends turn |

## Tuning (live)

```
frictionAir (TUNING.friction)  0.032
restitution                    0.88
obstacleRestitution            0.90
maxDrag                        140
maxSpeed                       26     // solo full flick ≈ 1× ice height
sleepSpeed                     0.16
turnMs                         20000
```

Physics steps at fixed 60Hz. Golden tests: `docs/PHYSICS_BRIEF.md`.

## Architecture

```
src/game/types.ts
src/game/tuning.ts
src/game/setup.ts      // opening layout
src/game/match.ts      // turns, ejections, items, win — no Matter
src/game/physics.ts    // Matter world only
src/render/draw.ts     // procedural arena + pucks (v1)
src/input/aim.ts
src/main.ts
```

After sim, write body positions back into `Piece[]`. Later net sync = serialize `Match`.

## Art / audio

Follow `docs/VISUAL_BRIEF.md`. Summary:

- Arena: deep water + floating ice slab + fluffy snow rim + cliffs/pines + floes
- Aim: green dotted power ring + crosshair (rage → warm red)
- Obstacles (if re-added): prefer rect ice bumpers
- v1 procedural Canvas; v2 swaps WebP sprites with same layer names
- Do **not** ship trademarked 空雅 / 野菜 / Koongya assets

## Build order

1. ~~Scaffold Vite+TS; canvas loop; ice + opening pieces.~~
2. ~~Aim drag + Matter flick + stop detection + ejection + win + turn swap + timer.~~
3. ~~Classic mode playable end-to-end (hotseat).~~
4. Visual + physics revise per briefs ← **current**
5. Items mode.
6. README + `wrangler` / Pages deploy notes; polish UX.

## Out of scope for first playable

AI, multiplayer rooms, ranking/score, chat, authentic IP art.

## Deploy target

GitHub repo → Cloudflare Pages from `dist` (`npm run build`).
