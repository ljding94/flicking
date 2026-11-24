import type { Match, Side } from "../game/types";

export type NetMsg =
  | { type: "hello"; role: "guest" | "spectator" }
  | { type: "welcome"; side: Side; seat: "player" | "spectator"; match: Match; roomCode: string }
  | { type: "state"; match: Match }
  | { type: "flick"; pieceId: string; vx: number; vy: number }
  | { type: "restart" }
  | { type: "peer-left" }
  | { type: "error"; message: string };

export function encode(msg: NetMsg): string {
  return JSON.stringify(msg);
}

export function decode(raw: string): NetMsg | null {
  try {
    const data = JSON.parse(raw) as NetMsg;
    if (!data || typeof data !== "object" || !("type" in data)) return null;
    return data;
  } catch {
    return null;
  }
}
