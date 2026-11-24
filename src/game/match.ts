import { TUNING } from "./tuning";
import type { Match, Piece, Side } from "./types";

export function alivePieces(match: Match, side?: Side): Piece[] {
  return match.pieces.filter((p) => p.alive && (side === undefined || p.side === side));
}

export function pieceById(match: Match, id: string): Piece | undefined {
  return match.pieces.find((p) => p.id === id);
}

export function isOnIce(piece: Piece): boolean {
  const { ice } = TUNING;
  return (
    piece.x >= ice.x &&
    piece.x <= ice.x + ice.w &&
    piece.y >= ice.y &&
    piece.y <= ice.y + ice.h
  );
}

/** Mark pieces whose centers left the ice. Returns how many were ejected this call. */
export function applyEjections(match: Match): number {
  let ejected = 0;
  for (const piece of match.pieces) {
    if (!piece.alive) continue;
    if (!isOnIce(piece)) {
      piece.alive = false;
      ejected += 1;
      if (piece.tier === "medium") {
        match.mediumLost[piece.side] += 1;
      }
    }
  }
  return ejected;
}

export function checkWinner(match: Match, actingSide: Side): Side | null {
  const redLeft = alivePieces(match, "red").length;
  const blueLeft = alivePieces(match, "blue").length;
  if (redLeft === 0 && blueLeft === 0) return actingSide;
  if (redLeft === 0) return "blue";
  if (blueLeft === 0) return "red";
  return null;
}

export function chargeItemMeter(match: Match, side: Side, ejected: number): void {
  if (match.mode !== "items" || ejected <= 0) return;
  const state = match.items[side];
  state.meter = Math.min(100, state.meter + ejected * TUNING.meterPerEject);
  const thresholds: Array<{ at: number; id: Match["items"]["red"]["available"][number] }> = [
    { at: 25, id: "rage" },
    { at: 50, id: "morph" },
    { at: 75, id: "blink" },
    { at: 100, id: "nova" },
  ];
  for (const t of thresholds) {
    if (state.meter >= t.at && !state.available.includes(t.id)) {
      state.available.push(t.id);
    }
  }
}

export function endTurn(match: Match): void {
  if (match.phase === "over") return;
  match.turn = match.turn === "red" ? "blue" : "red";
  match.phase = "aim";
  match.turnMsLeft = TUNING.turnMs;
}

export function finishSimulation(
  match: Match,
  actingSide: Side,
  ejectedThisTurn = 0,
): void {
  const ejected = ejectedThisTurn + applyEjections(match);
  chargeItemMeter(match, actingSide, ejected);
  const winner = checkWinner(match, actingSide);
  if (winner) {
    match.winner = winner;
    match.phase = "over";
    return;
  }
  endTurn(match);
}

export function tickTurnTimer(match: Match, dtMs: number): boolean {
  if (match.phase !== "aim") return false;
  match.turnMsLeft = Math.max(0, match.turnMsLeft - dtMs);
  if (match.turnMsLeft <= 0) {
    endTurn(match);
    return true;
  }
  return false;
}

export function opponent(side: Side): Side {
  return side === "red" ? "blue" : "red";
}
