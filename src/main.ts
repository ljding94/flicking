import "./style.css";
import { applyEjections, finishSimulation, tickTurnTimer } from "./game/match";
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
} from "./game/physics";
import { createMatch } from "./game/setup";
import { TUNING } from "./game/tuning";
import type { Match } from "./game/types";
import {
  aimPointerDown,
  aimPointerMove,
  aimPointerUp,
  cancelAim,
  createAimState,
} from "./input/aim";
import { drawFrame } from "./render/draw";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div class="shell">
    <header class="top">
      <h1>Flicking</h1>
      <p>拉回蓄力 · 松手弹出 · 把对方打出冰面</p>
    </header>
    <canvas id="board" width="${TUNING.board.w}" height="${TUNING.board.h}"></canvas>
    <footer class="hint">
      <span>同屏双人轮流 · 红方先手</span>
      <span>R 重开 · Esc 取消瞄准</span>
    </footer>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#board")!;
const ctx = canvas.getContext("2d")!;

let match: Match = createMatch("classic");
let world: PhysicsWorld = createPhysics(match);
let aim = createAimState();
let lastTs = performance.now();
let settleFrames = 0;

function resetGame(): void {
  destroyPhysics(world);
  match = createMatch("classic");
  world = createPhysics(match);
  aim = createAimState();
  settleFrames = 0;
}

function toBoardCoords(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = TUNING.board.w / rect.width;
  const scaleY = TUNING.board.h / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  const { x, y } = toBoardCoords(e.clientX, e.clientY);
  aimPointerDown(aim, match, x, y);
});

canvas.addEventListener("pointermove", (e) => {
  const { x, y } = toBoardCoords(e.clientX, e.clientY);
  aimPointerMove(aim, x, y);
});

canvas.addEventListener("pointerup", (e) => {
  const { x, y } = toBoardCoords(e.clientX, e.clientY);
  aimPointerMove(aim, x, y);
  const flick = aimPointerUp(aim, match);
  if (!flick) return;
  const acting = match.turn;
  match.phase = "simulate";
  applyFlick(world, flick.pieceId, flick.vx, flick.vy);
  settleFrames = 0;
  ejectedThisTurn = 0;
  pendingActor = acting;
});

canvas.addEventListener("pointercancel", () => cancelAim(aim));

window.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") {
    resetGame();
  }
  if (e.key === "Escape") {
    cancelAim(aim);
  }
});

let pendingActor: Match["turn"] = "red";
let ejectedThisTurn = 0;

function frame(ts: number): void {
  const dt = Math.min(50, ts - lastTs);
  lastTs = ts;

  if (match.phase === "aim") {
    tickTurnTimer(match, dt);
  }

  if (match.phase === "simulate") {
    stepPhysics(world, dt);
    writePositionsToMatch(world, match);
    const justOut = applyEjections(match);
    if (justOut > 0) {
      ejectedThisTurn += justOut;
      removeDeadBodies(world, match);
    }

    if (allSleeping(world)) {
      settleFrames += 1;
    } else {
      settleFrames = 0;
    }

    // require a few quiet frames so tiny bounces finish
    if (settleFrames >= 8) {
      writePositionsToMatch(world, match);
      finishSimulation(match, pendingActor, ejectedThisTurn);
      ejectedThisTurn = 0;
      syncBodiesFromMatch(world, match);
      settleFrames = 0;
    }
  }

  drawFrame(ctx, match, aim);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
