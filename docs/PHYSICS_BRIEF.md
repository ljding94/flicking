# Flicking — Physics reference brief

We already use **Matter.js** (zero-g circles + `frictionAir`). Do **not** rewrite the engine from scratch. Borrow **feel targets and constants** from open Alkkagi / Carrom projects, then tune against a few golden tests.

## Best references (ranked)

### 1. Omokboard Alkkagi — best published numbers (custom JS, readable)

- Live game: https://omokboard.com/alkkagi  
- Physics source: https://omokboard.com/alkkagi.js?v=7  
- Dev log (why these values): https://omokboard.com/en/alkkagi-friction  

```js
const FRICTION    = 0.960; // per-frame multiply (4% slowdown @ 60fps)
const RESTITUTION = 0.90;
const MIN_SPEED   = 0.20;
const MAX_LAUNCH  = 20;    // px/frame on 560 board
// power = min(pullDist * 0.38, MAX_LAUNCH)
```

Feel target they settled on:

| Metric | Bad (too icy) | Good |
|--------|---------------|------|
| Full-power slide | 2.37× board | **~0.94× board** |
| Time to stop | ~5.3 s | **~1.9 s** |

Ice flick chess should feel closer to this than to billiards: one full miss nearly clears the rink, but does not loop forever.

### 2. KAGE-CARROM — best Matter.js twin (MIT)

- https://github.com/ISBANDURAHUMAN-R/KAGE-CARROM  
- `src/game/constants.js` + `src/game/physics.js`  

Same stack as us: Matter.js, gravity 0, `frictionAir`, mass tiers, rest threshold.

```js
PHYSICS_CONFIG = {
  restitution: 0.94,
  friction: 0.0008,
  frictionAir: { fast: 0.012, standard: 0.016, vintage: 0.022 },
  strikerMass: 3.6,
  coinMass: 1.0,
  maxImpulseForce: 0.092,
  restVelocityThreshold: 0.16,
}
```

Our current `frictionAir: 0.022` already matches their **vintage** preset. Biggest gap vs Carrom/Alkkagi feel: our `restitution: 0.42` is much deader than their **0.94** / Omokboard **0.90**.

### 3. yanmoyy/go-go-go — MIT custom Alkkagi (Go)

- https://github.com/yanmoyy/go-go-go  
- Collision: `internal/game/util.go` (`e = 0.75`)  
- Loop: `internal/game/game.go` (`friction = 0.1` subtractive per dt)  

Useful as a clean equal-mass impulse reference, not as drop-in browser code.

### 4. GameNow Alkkagi — numbers only (not OSS)

- Guide: https://gamenow.us/en/reading/alkkagi-power-angles-edges-guide/  

Published feel:

- restitution **0.88**
- launch speed `1.2 + 9.8 * power`
- straight hit ≈ passes most speed; shooter nearly stops
- opening: ~**52.5%** power to knock opposite stone off; miss at **55%** falls off far edge

Great as acceptance tests even without their source.

### 5. Others (lower priority)

| Project | Notes |
|---------|--------|
| [mangto/Alkkagi](https://github.com/mangto/Alkkagi) | Python/Pygame educational; collision code rough |
| [unono915/openCV_Alkkagi](https://github.com/unono915/openCV_Alkkagi) | Camera flick input, not physics gold |
| [SairamNaragoni/carrom](https://github.com/SairamNaragoni/carrom) | Older canvas carrom |
| Matter.js [slingshot / friction / restitution demos](https://github.com/liabru/matter-js/tree/master/examples) | Engine knobs, not flick-feel |

## Our current vs targets

| Knob | Flicking now | Omokboard / KAGE target band |
|------|--------------|------------------------------|
| Engine | Matter.js | Keep |
| Gravity | 0 | 0 |
| Drag model | `frictionAir` | keep; Omokboard uses `v *= 0.96` (different model, same feel goal) |
| `frictionAir` | 0.022 | 0.012–0.022 (KAGE) |
| `restitution` | **0.42** | **0.85–0.94** ← raise |
| `obstacleRestitution` | 0.88 | ~0.90 OK |
| `sleepSpeed` | 0.18 | ~0.16–0.20 |
| Full-power travel | untuned | **~0.9–1.0× ice length** |
| Stop time | untuned | **~1.5–2.5 s** |

Ice (野菜 style) should be a bit more slippery than wooden Alkkagi, so bias toward the **lower** frictionAir end (≈0.014–0.018) once restitution is raised — then re-check the slide-distance test.

## Recommended approach for build

1. **Keep Matter.js** — KAGE proves the stack works for flick games.
2. **Port feel tests**, not copy code blindly:
   - Solo full-power flick down the long ice axis → stop near far edge (~0.9–1.1× ice height), not 2×.
   - Straight center hit, equal mass → shooter nearly stops, target takes most speed.
   - Opening-distance knock-off around mid power (calibrate like GameNow’s ~52%).
3. **Raise restitution toward 0.85–0.90**, then retune `frictionAir` / `maxSpeed` to hit slide distance.
4. Cap launch speed; prefer `Body.setVelocity` (already) over huge forces (tunneling).
5. Use Matter Runner **sub-steps** if fast flicks tunnel (Matter 0.20+).
6. Optional later: read Omokboard `alkkagi.js` collision impulse block as a cross-check, but stay on Matter for maintenance.

## Hand to build

Primary code to skim:

1. https://omokboard.com/alkkagi.js?v=7  
2. https://github.com/ISBANDURAHUMAN-R/KAGE-CARROM/blob/main/src/game/constants.js  
3. https://github.com/ISBANDURAHUMAN-R/KAGE-CARROM/blob/main/src/game/physics.js  
4. https://github.com/yanmoyy/go-go-go/blob/main/internal/game/util.go  
