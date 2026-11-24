# Flicking — Visual Brief (from real references)

Local reference images: `docs/refs/`  
Sources (do not ship copyrighted sprites; study structure only):

| File | Source | What it shows |
|------|--------|----------------|
| `help_aim.gif` | [iGame help](https://igame.f2gg.com/help/yaburi/jieshao_xiao.htm) | Full ice arena, pieces, obstacles, timer UI |
| `help_power.gif` | same | Ice rink + water + ship spectators + item bar |
| `help_items.gif` | same | Piece close-up + green aim crosshair / power ring |
| `help_ui_*.gif` | same | Lobby / hub vibe (rounded casual UI) |
| `ant_01.jpg` | [Ant news](http://yecaibuluo.com/portal/newsDetail?articleId=10004) | Arcade hub (弹棋 entrance building) |
| `dz_*.png/jpg` | [downza](https://www.downza.cn/soft/333518.html) | Remake world / UI chrome (style, not board) |

Adjacent non-IP style refs (structure only):

- [PLAYUS Alkkagi](https://www.playus.app/zh-Hans/games/alkkagi) — ice rink stage, flick UX
- [Short-Puck (itch.io)](https://blurbs-yt.itch.io/short-puck) — cute puck on ice, isometric cozy

**Do not copy** 空雅 / Koongya vegetable characters, logos, or UI art into the repo.

---

## What the original actually looks like

### 1. Pieces = character on a white puck (not flat discs)

From `help_items.gif` / `help_aim.gif`:

- Thick **white cylindrical base** (air-hockey puck / ice pedestal)
- Cute **chibi character sitting on top** (round body, big eyes)
- Soft drop shadow under the puck
- **Size tiers**: one large “anchor” piece, surrounding small pieces
- Optional **heart / marker** floating above active-team pieces

Our v1 discs + 象棋字 are the wrong silhouette. Target silhouette:

```
      [ face ]
   /  body  \
  |__________|   ← white puck collar
  |__shadow__|
```

**Original IP uses vegetables.** We use original mascots with the *same construction*:

| Side | Mascot direction (original, not Koongya) |
|------|------------------------------------------|
| Warm team | Coral “ember chick” / soft flame blob on white puck |
| Cool team | Ice-blue “snow chick” / frost blob on white puck |

Same face kit, different scarf / shell tint. Badge for role (pawn/horse/…) tiny on puck rim.

### 2. Arena = ice slab floating in water

From `help_aim.gif` / `help_power.gif`:

1. **Far water** — deep saturated blue
2. **Ice floes / rocks** scattered in water (non-colliding decor)
3. **Main ice rectangle** — bright white–cyan, faint crack veins
4. **Snow berm** — fluffy / jagged white rim around the ice (critical nostalgia cue)
5. **Corners** — snowy cliffs + dark pine needles
6. **Optional spectators** — wooden ship deck with tiny crowd (left in `help_power.gif`)

Obstacles in refs are **rect ice blocks** or **brown logs**, not only round pillars. Prefer 2–4 short rect ice bumpers + maybe one round crystal.

### 3. Aim VFX (match help_items.gif)

- Selected piece: **green crosshair** (H+V)
- **Dotted green ring** around piece = power (grows with drag)
- **Dotted green line** = flight direction
- Rage: ring/line shift to warm red-orange

### 4. HUD chrome

- Top: **wood-framed** timer bar with team icon
- Bottom: item slots (items mode) + chat optional later
- Buttons look like **ice blocks / wood plaques**, bubbly early-2000s casual MMO
- Palette: sky/ice blues, white snow, warm wood accents — not flat dark navy HUD

### 5. Motion polish (inferred from feel)

- Soft oval shadow under each puck
- Ice dust trail while sliding
- White star burst on collision
- Shrink + splash chips when ejecting into water
- Slow ambient snow particles

---

## Asset list for build (v1 procedural → v2 sprites)

```
public/art/
  bg-water.webp          # deep blue water fill / gradient OK
  ice-slab.webp          # cracks + translucency
  snow-rim.webp          # 9-slice or tiled berm
  floe-{1,2,3}.webp      # decor ice chunks
  cliff-pine-l.webp
  cliff-pine-r.webp
  bumper-ice.webp        # rect obstacle
  bumper-log.webp        # optional
  puck-base-{s,m,l}.webp # white cylinder top-down
  face-warm-{idle}.webp
  face-cool-{idle}.webp
  badge-{role}.svg
  aim-ring.png           # or draw procedurally
public/sfx/              # Kenney CC0 later
```

**v1 implementation path (no painter required):**

1. Layered Canvas background: water → floes → ice slab + crack strokes → snow rim noise → cliffs
2. Pieces: draw white puck ellipse + colored character ellipse + eyes + rim badge
3. Obstacles: rounded rect ice blocks with highlight
4. Aim: dashed ring + crosshair like the help GIF
5. Swap to hand-drawn WebP when ready; keep same layer names

---

## Priority for build session

1. Replace flat discs with **puck + character** silhouette  
2. Rebuild background as **water + ice slab + snow rim + cliffs**  
3. Retarget aim UI to **green dotted ring / crosshair**  
4. Ice-block bumpers  
5. Shadows + eject splash  

Mechanics stay as in `BUILD_BRIEF.md`.
