import { TIER_STATS, TUNING } from "./tuning";
import type { Match, Piece, Role, Side, Tier } from "./types";

/** Nine files, inset from the ice rim. */
const FILE_X = [160, 210, 260, 310, 360, 410, 460, 510, 560] as const;

type Slot = { role: Role; tier: Tier; file: number; y: number };

/** Compact ranks with empty ice around both armies. */
const RED_SLOTS: Slot[] = [
  { role: "chariot", tier: "large", file: 0, y: 790 },
  { role: "horse", tier: "medium", file: 1, y: 790 },
  { role: "elephant", tier: "medium", file: 2, y: 790 },
  { role: "advisor", tier: "medium", file: 3, y: 790 },
  { role: "general", tier: "anchor", file: 4, y: 790 },
  { role: "advisor", tier: "medium", file: 5, y: 790 },
  { role: "elephant", tier: "medium", file: 6, y: 790 },
  { role: "horse", tier: "medium", file: 7, y: 790 },
  { role: "chariot", tier: "large", file: 8, y: 790 },
  { role: "cannon", tier: "medium", file: 1, y: 700 },
  { role: "cannon", tier: "medium", file: 7, y: 700 },
  { role: "pawn", tier: "small", file: 0, y: 610 },
  { role: "pawn", tier: "small", file: 2, y: 610 },
  { role: "pawn", tier: "small", file: 4, y: 610 },
  { role: "pawn", tier: "small", file: 6, y: 610 },
  { role: "pawn", tier: "small", file: 8, y: 610 },
];

function mirrorY(y: number): number {
  return TUNING.board.h - y;
}

function makePiece(side: Side, slot: Slot, index: number): Piece {
  const stats = TIER_STATS[slot.tier];
  const y = side === "red" ? slot.y : mirrorY(slot.y);
  return {
    id: `${side}-${slot.role}-${index}`,
    side,
    role: slot.role,
    tier: slot.tier,
    radius: stats.radius,
    mass: stats.mass,
    x: FILE_X[slot.file],
    y,
    alive: true,
  };
}

function makeObstacles(): Match["obstacles"] {
  return [];
}

function emptyItems() {
  return {
    meter: 0,
    available: [] as Match["items"]["red"]["available"],
    armed: null as Match["items"]["red"]["armed"],
  };
}

export function createMatch(mode: Match["mode"] = "classic"): Match {
  const pieces: Piece[] = [];
  RED_SLOTS.forEach((slot, i) => pieces.push(makePiece("red", slot, i)));
  RED_SLOTS.forEach((slot, i) => pieces.push(makePiece("blue", slot, i)));

  return {
    mode,
    pieces,
    obstacles: makeObstacles(),
    turn: "red",
    phase: "aim",
    turnMsLeft: TUNING.turnMs,
    items: { red: emptyItems(), blue: emptyItems() },
    mediumLost: { red: 0, blue: 0 },
    winner: null,
  };
}
