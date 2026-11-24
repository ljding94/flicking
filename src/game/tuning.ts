import type { Tier, Tuning } from "./types";

/** Portrait ~3:4 — width kept, height shortened vs early tall draft. */
export const TUNING: Tuning = {
  board: { w: 720, h: 960 },
  ice: { x: 48, y: 56, w: 624, h: 856 },
  // Physics brief: high restitution (Alkkagi/Carrom band) + frictionAir/maxSpeed
  // so full-power solo slide ≈ 0.9–1.1× ice height and stops in ~2s.
  friction: 0.032,
  restitution: 0.88,
  obstacleRestitution: 0.9,
  maxDrag: 140,
  maxSpeed: 26,
  rageMultiplier: 1.65,
  turnMs: 20_000,
  sleepSpeed: 0.16,
  novaRadius: 130,
  novaImpulse: 0.42,
  meterPerEject: 18,
};

/**
 * Small radii so the rink feels large. Mass (not density) drives collisions
 * (ratio ~ 1 : 3 : 5.5 : 9).
 */
export const TIER_STATS: Record<Tier, { radius: number; mass: number }> = {
  small: { radius: 11, mass: 1 },
  medium: { radius: 15, mass: 3 },
  large: { radius: 18, mass: 5.5 },
  anchor: { radius: 21, mass: 9 },
};

export const ROLE_LABEL: Record<string, string> = {
  pawn: "兵",
  cannon: "炮",
  horse: "马",
  elephant: "象",
  advisor: "士",
  chariot: "车",
  general: "将",
};

export function generalLabel(side: "red" | "blue"): string {
  return side === "red" ? "帅" : "将";
}
