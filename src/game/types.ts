export type Side = "red" | "blue";
export type Tier = "small" | "medium" | "large" | "anchor";
export type Role =
  | "pawn"
  | "cannon"
  | "horse"
  | "elephant"
  | "advisor"
  | "chariot"
  | "general";
export type ItemId = "rage" | "morph" | "blink" | "nova";
export type Phase = "aim" | "simulate" | "place" | "over";

export interface Piece {
  id: string;
  side: Side;
  role: Role;
  tier: Tier;
  radius: number;
  mass: number;
  x: number;
  y: number;
  alive: boolean;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface ItemState {
  meter: number;
  available: ItemId[];
  armed: ItemId | null;
}

export interface Match {
  mode: "classic" | "items";
  pieces: Piece[];
  obstacles: Obstacle[];
  turn: Side;
  phase: Phase;
  turnMsLeft: number;
  items: Record<Side, ItemState>;
  mediumLost: Record<Side, number>;
  winner: Side | null;
}

export interface AimState {
  pieceId: string | null;
  pointerX: number;
  pointerY: number;
  dragging: boolean;
}

export interface Tuning {
  board: { w: number; h: number };
  ice: { x: number; y: number; w: number; h: number };
  friction: number;
  restitution: number;
  obstacleRestitution: number;
  maxDrag: number;
  maxSpeed: number;
  rageMultiplier: number;
  turnMs: number;
  sleepSpeed: number;
  novaRadius: number;
  novaImpulse: number;
  meterPerEject: number;
}
