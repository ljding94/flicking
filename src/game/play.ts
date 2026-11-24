import { applyEjections, finishSimulation, tickTurnTimer } from "./match";
import {
  allSleeping,
  applyFlick,
  createPhysics,
  destroyPhysics,
  removeDeadBodies,
  stepPhysics,
  syncBodiesFromMatch,
  writePositionsToMatch,
  type PhysicsWorld,
} from "./physics";
import { createMatch } from "./setup";
import type { Match, Side } from "./types";
import {
  aimPointerDown,
  aimPointerMove,
  aimPointerUp,
  cancelAim,
  createAimState,
  type AimOptions,
  type FlickIntent,
} from "../input/aim";
import { drawFrame } from "../render/draw";
import { TUNING } from "./tuning";

export type PlayMode = "local" | "online-host" | "online-client";

export interface PlayCallbacks {
  /** Host: notify peers after state changes / during sim. */
  onMatchChanged?: (match: Match, reason: "flick" | "tick" | "settle" | "reset" | "sync") => void;
  /** Client: send flick intent to host. */
  onFlickIntent?: (flick: FlickIntent) => void;
}

export interface PlaySession {
  getMatch: () => Match;
  getAim: () => ReturnType<typeof createAimState>;
  /** Side this client controls; null = local hotseat (both). */
  mySide: Side | null;
  mode: PlayMode;
  canvas: HTMLCanvasElement;
  applyRemoteFlick: (flick: FlickIntent) => boolean;
  applyRemoteMatch: (next: Match) => void;
  reset: () => void;
  destroy: () => void;
  setStatusEl: (el: HTMLElement | null) => void;
}

export function startPlay(
  canvas: HTMLCanvasElement,
  mode: PlayMode,
  mySide: Side | null,
  callbacks: PlayCallbacks = {},
): PlaySession {
  const ctx = canvas.getContext("2d")!;
  let match = createMatch("classic");
  let world: PhysicsWorld = createPhysics(match);
  let aim = createAimState();
  let lastTs = performance.now();
  let settleFrames = 0;
  let pendingActor: Side = "red";
  let ejectedThisTurn = 0;
  let lastBroadcast = 0;
  let statusEl: HTMLElement | null = null;
  let raf = 0;
  let alive = true;

  const isAuthority = mode === "local" || mode === "online-host";
  const aimOpts = (): AimOptions => ({
    onlySide: mode === "local" ? null : mySide,
  });

  function setHint(text: string): void {
    if (statusEl) statusEl.textContent = text;
  }

  function updateHint(): void {
    if (mode === "local") {
      setHint(
        match.phase === "over"
          ? match.winner === "red"
            ? "红方胜利 · R 重开"
            : "蓝方胜利 · R 重开"
          : `同屏 · ${match.turn === "red" ? "红方" : "蓝方"}行动`,
      );
      return;
    }
    const sideLabel = mySide === "red" ? "你是红方" : mySide === "blue" ? "你是蓝方" : "观战";
    if (match.phase === "over") {
      setHint(
        `${sideLabel} · ${match.winner === "red" ? "红方" : "蓝方"}胜利${isAuthority ? " · R 重开" : ""}`,
      );
      return;
    }
    if (!mySide) {
      setHint(`${sideLabel} · ${match.turn === "red" ? "红方" : "蓝方"}行动中`);
      return;
    }
    setHint(
      match.turn === mySide
        ? `${sideLabel} · 轮到你了`
        : `${sideLabel} · 等待对手…`,
    );
  }

  function beginFlick(flick: FlickIntent, acting: Side): void {
    match.phase = "simulate";
    applyFlick(world, flick.pieceId, flick.vx, flick.vy);
    settleFrames = 0;
    ejectedThisTurn = 0;
    pendingActor = acting;
    callbacks.onMatchChanged?.(match, "flick");
  }

  function applyRemoteFlick(flick: FlickIntent): boolean {
    if (!isAuthority || match.phase !== "aim") return false;
    const piece = match.pieces.find((p) => p.id === flick.pieceId);
    if (!piece || !piece.alive || piece.side !== match.turn) return false;
    beginFlick(flick, match.turn);
    return true;
  }

  function applyRemoteMatch(next: Match): void {
    match = next;
    cancelAim(aim);
    updateHint();
  }

  function reset(): void {
    if (!isAuthority) return;
    destroyPhysics(world);
    match = createMatch("classic");
    world = createPhysics(match);
    aim = createAimState();
    settleFrames = 0;
    ejectedThisTurn = 0;
    callbacks.onMatchChanged?.(match, "reset");
    updateHint();
  }

  function toBoardCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) * TUNING.board.w) / rect.width,
      y: ((clientY - rect.top) * TUNING.board.h) / rect.height,
    };
  }

  const onDown = (e: PointerEvent) => {
    if (mode !== "local" && !mySide) return;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = toBoardCoords(e.clientX, e.clientY);
    aimPointerDown(aim, match, x, y, aimOpts());
  };
  const onMove = (e: PointerEvent) => {
    const { x, y } = toBoardCoords(e.clientX, e.clientY);
    aimPointerMove(aim, x, y);
  };
  const onUp = (e: PointerEvent) => {
    const { x, y } = toBoardCoords(e.clientX, e.clientY);
    aimPointerMove(aim, x, y);
    const flick = aimPointerUp(aim, match);
    if (!flick) return;

    if (mode === "online-client") {
      if (!mySide || match.turn !== mySide) return;
      callbacks.onFlickIntent?.(flick);
      return;
    }

    // local or host
    if (mode === "online-host" && mySide && match.turn !== mySide) return;
    beginFlick(flick, match.turn);
  };
  const onCancel = () => cancelAim(aim);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") cancelAim(aim);
    if ((e.key === "r" || e.key === "R") && isAuthority) reset();
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);
  window.addEventListener("keydown", onKey);

  function frame(ts: number): void {
    if (!alive) return;
    const dt = Math.min(50, ts - lastTs);
    lastTs = ts;

    if (isAuthority) {
      if (match.phase === "aim") {
        const before = match.turnMsLeft;
        tickTurnTimer(match, dt);
        if (match.turnMsLeft !== before) {
          callbacks.onMatchChanged?.(match, "tick");
        }
      }

      if (match.phase === "simulate") {
        stepPhysics(world, dt);
        writePositionsToMatch(world, match);
        const justOut = applyEjections(match);
        if (justOut > 0) {
          ejectedThisTurn += justOut;
          removeDeadBodies(world, match);
        }

        if (allSleeping(world)) settleFrames += 1;
        else settleFrames = 0;

        if (settleFrames >= 8) {
          writePositionsToMatch(world, match);
          finishSimulation(match, pendingActor, ejectedThisTurn);
          ejectedThisTurn = 0;
          syncBodiesFromMatch(world, match);
          settleFrames = 0;
          callbacks.onMatchChanged?.(match, "settle");
        } else if (ts - lastBroadcast > 50) {
          lastBroadcast = ts;
          callbacks.onMatchChanged?.(match, "sync");
        }
      }
    }

    updateHint();
    drawFrame(ctx, match, aim);
    raf = requestAnimationFrame(frame);
  }

  updateHint();
  raf = requestAnimationFrame(frame);

  return {
    getMatch: () => match,
    getAim: () => aim,
    mySide,
    mode,
    canvas,
    applyRemoteFlick,
    applyRemoteMatch,
    reset,
    setStatusEl: (el) => {
      statusEl = el;
      updateHint();
    },
    destroy: () => {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      destroyPhysics(world);
    },
  };
}
