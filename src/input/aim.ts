import { TUNING } from "../game/tuning";
import type { AimState, Match } from "../game/types";
import { alivePieces } from "../game/match";

export function createAimState(): AimState {
  return {
    pieceId: null,
    pointerX: 0,
    pointerY: 0,
    dragging: false,
  };
}

function hitTest(match: Match, x: number, y: number): string | null {
  const own = alivePieces(match, match.turn);
  // Prefer smaller pieces on top of larger when overlapping
  const sorted = [...own].sort((a, b) => a.radius - b.radius);
  for (const piece of sorted) {
    const dx = x - piece.x;
    const dy = y - piece.y;
    if (dx * dx + dy * dy <= piece.radius * piece.radius) {
      return piece.id;
    }
  }
  return null;
}

export function aimPointerDown(
  aim: AimState,
  match: Match,
  x: number,
  y: number,
): void {
  if (match.phase !== "aim") return;
  const id = hitTest(match, x, y);
  if (!id) return;
  aim.pieceId = id;
  aim.pointerX = x;
  aim.pointerY = y;
  aim.dragging = true;
}

export function aimPointerMove(aim: AimState, x: number, y: number): void {
  if (!aim.dragging) return;
  aim.pointerX = x;
  aim.pointerY = y;
}

export interface FlickIntent {
  pieceId: string;
  vx: number;
  vy: number;
  power: number;
}

/** Direction is from pointer toward piece (pull back to aim forward). */
export function aimPointerUp(aim: AimState, match: Match): FlickIntent | null {
  if (!aim.dragging || !aim.pieceId || match.phase !== "aim") {
    aim.dragging = false;
    aim.pieceId = null;
    return null;
  }

  const piece = match.pieces.find((p) => p.id === aim.pieceId);
  if (!piece || !piece.alive) {
    aim.dragging = false;
    aim.pieceId = null;
    return null;
  }

  const dx = piece.x - aim.pointerX;
  const dy = piece.y - aim.pointerY;
  const dist = Math.hypot(dx, dy);
  const power = Math.min(1, dist / TUNING.maxDrag);

  aim.dragging = false;
  const pieceId = aim.pieceId;
  aim.pieceId = null;

  if (power < 0.05) return null;

  const speed = power * TUNING.maxSpeed;
  const inv = dist > 0 ? 1 / dist : 0;
  return {
    pieceId,
    vx: dx * inv * speed,
    vy: dy * inv * speed,
    power,
  };
}

export function cancelAim(aim: AimState): void {
  aim.dragging = false;
  aim.pieceId = null;
}

export function getAimVisual(
  aim: AimState,
  match: Match,
): { x: number; y: number; dx: number; dy: number; power: number } | null {
  if (!aim.dragging || !aim.pieceId) return null;
  const piece = match.pieces.find((p) => p.id === aim.pieceId);
  if (!piece) return null;
  const dx = piece.x - aim.pointerX;
  const dy = piece.y - aim.pointerY;
  const dist = Math.hypot(dx, dy);
  const power = Math.min(1, dist / TUNING.maxDrag);
  return { x: piece.x, y: piece.y, dx, dy, power };
}
