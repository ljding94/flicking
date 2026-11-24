import { generalLabel, ROLE_LABEL, TUNING } from "../game/tuning";
import type { AimState, Match, Piece } from "../game/types";
import { alivePieces } from "../game/match";
import { getAimVisual } from "../input/aim";

const WARM = { body: "#f07858", cheek: "#ffb09a", accent: "#e85d4c" };
const COOL = { body: "#6ec4e8", cheek: "#b8e4f7", accent: "#3d8fd1" };

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  match: Match,
  aim: AimState,
): void {
  const { board, ice } = TUNING;
  ctx.clearRect(0, 0, board.w, board.h);

  drawWater(ctx, board.w, board.h);
  drawFloes(ctx, board.w, board.h, ice);
  drawCliffs(ctx, board.w, board.h);
  drawIceSlab(ctx, ice);
  drawSnowRim(ctx, ice);
  drawObstacles(ctx, match);
  drawPieces(ctx, match);
  drawAim(ctx, match, aim);
  drawHud(ctx, match);
}

function drawWater(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1a6a9a");
  g.addColorStop(0.45, "#1e7aad");
  g.addColorStop(1, "#155a88");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // soft ripples
  ctx.strokeStyle = "rgba(180, 230, 255, 0.12)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const y = 40 + i * (h / 8);
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 40) {
      ctx.lineTo(x, y + Math.sin(x * 0.04 + i) * 4);
    }
    ctx.stroke();
  }
}

function drawFloes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ice: { x: number; y: number; w: number; h: number },
): void {
  const floes = [
    { x: 18, y: 120, rw: 36, rh: 22 },
    { x: w - 50, y: 180, rw: 40, rh: 24 },
    { x: 30, y: h - 160, rw: 44, rh: 26 },
    { x: w - 60, y: h - 200, rw: 38, rh: 22 },
    { x: 12, y: h / 2, rw: 28, rh: 18 },
    { x: w - 40, y: h / 2 + 40, rw: 32, rh: 20 },
  ];
  for (const f of floes) {
    // skip if overlapping ice heavily
    if (
      f.x > ice.x - 10 &&
      f.x < ice.x + ice.w &&
      f.y > ice.y &&
      f.y < ice.y + ice.h
    ) {
      continue;
    }
    ctx.fillStyle = "rgba(220, 240, 250, 0.85)";
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, f.rw, f.rh, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawCliffs(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // top-left snow mound + pines
  ctx.fillStyle = "#e8f4fa";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(130, 0);
  ctx.quadraticCurveTo(100, 70, 0, 110);
  ctx.closePath();
  ctx.fill();
  drawPine(ctx, 36, 70, 0.85);
  drawPine(ctx, 72, 52, 1.05);

  // top-right
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(w - 140, 0);
  ctx.quadraticCurveTo(w - 100, 75, w, 120);
  ctx.closePath();
  ctx.fill();
  drawPine(ctx, w - 40, 68, 0.9);
  drawPine(ctx, w - 78, 48, 1.1);

  // bottom corners (smaller)
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(90, h);
  ctx.quadraticCurveTo(70, h - 50, 0, h - 70);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(w, h);
  ctx.lineTo(w - 100, h);
  ctx.quadraticCurveTo(w - 70, h - 55, w, h - 80);
  ctx.closePath();
  ctx.fill();
}

function drawPine(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = "#2d5a45";
  for (let i = 0; i < 3; i++) {
    const yy = y - i * 12 * s;
    const hw = (18 - i * 3) * s;
    ctx.beginPath();
    ctx.moveTo(x, yy - 16 * s);
    ctx.lineTo(x + hw, yy + 6 * s);
    ctx.lineTo(x - hw, yy + 6 * s);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#5a3a28";
  ctx.fillRect(x - 2 * s, y + 4 * s, 4 * s, 10 * s);
}

function drawIceSlab(
  ctx: CanvasRenderingContext2D,
  ice: { x: number; y: number; w: number; h: number },
): void {
  // soft underwater shadow
  ctx.fillStyle = "rgba(10, 40, 70, 0.25)";
  roundRect(ctx, ice.x + 6, ice.y + 10, ice.w, ice.h, 16);
  ctx.fill();

  const g = ctx.createLinearGradient(ice.x, ice.y, ice.x, ice.y + ice.h);
  g.addColorStop(0, "#f7fcff");
  g.addColorStop(0.4, "#e8f5fb");
  g.addColorStop(1, "#d4ebf5");
  ctx.fillStyle = g;
  roundRect(ctx, ice.x, ice.y, ice.w, ice.h, 14);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, ice.x, ice.y, ice.w, ice.h, 14);
  ctx.clip();

  // crack veins
  ctx.strokeStyle = "rgba(120, 170, 200, 0.28)";
  ctx.lineWidth = 1.2;
  const cracks = [
    [0.15, 0.2, 0.45, 0.28, 0.7, 0.22],
    [0.2, 0.55, 0.4, 0.62, 0.55, 0.5],
    [0.6, 0.7, 0.78, 0.78, 0.9, 0.72],
    [0.1, 0.8, 0.25, 0.85, 0.35, 0.78],
  ];
  for (const c of cracks) {
    ctx.beginPath();
    ctx.moveTo(ice.x + c[0] * ice.w, ice.y + c[1] * ice.h);
    ctx.quadraticCurveTo(
      ice.x + c[2] * ice.w,
      ice.y + c[3] * ice.h,
      ice.x + c[4] * ice.w,
      ice.y + c[5] * ice.h,
    );
    ctx.stroke();
  }

  // center dashed river
  ctx.strokeStyle = "rgba(90, 150, 190, 0.22)";
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(ice.x + 24, TUNING.board.h / 2);
  ctx.lineTo(ice.x + ice.w - 24, TUNING.board.h / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawSnowRim(
  ctx: CanvasRenderingContext2D,
  ice: { x: number; y: number; w: number; h: number },
): void {
  const bumps = 28;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(200, 220, 235, 0.8)";
  ctx.lineWidth = 1;

  // top berm
  ctx.beginPath();
  ctx.moveTo(ice.x - 8, ice.y);
  for (let i = 0; i <= bumps; i++) {
    const t = i / bumps;
    const x = ice.x + t * ice.w;
    const y = ice.y - 6 - Math.abs(Math.sin(t * Math.PI * 6)) * 10;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(ice.x + ice.w + 8, ice.y);
  ctx.closePath();
  ctx.fill();

  // bottom berm
  ctx.beginPath();
  ctx.moveTo(ice.x - 8, ice.y + ice.h);
  for (let i = 0; i <= bumps; i++) {
    const t = i / bumps;
    const x = ice.x + t * ice.w;
    const y = ice.y + ice.h + 6 + Math.abs(Math.sin(t * Math.PI * 6 + 1)) * 10;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(ice.x + ice.w + 8, ice.y + ice.h);
  ctx.closePath();
  ctx.fill();

  // left / right fluffy edge
  for (const side of [-1, 1] as const) {
    const baseX = side < 0 ? ice.x : ice.x + ice.w;
    ctx.beginPath();
    ctx.moveTo(baseX, ice.y);
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const y = ice.y + t * ice.h;
      const x = baseX + side * (6 + Math.abs(Math.sin(t * Math.PI * 5)) * 9);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(baseX, ice.y + ice.h);
    ctx.closePath();
    ctx.fill();
  }
}

function drawObstacles(ctx: CanvasRenderingContext2D, match: Match): void {
  for (const o of match.obstacles) {
    // Prefer rect-ish ice bumper look even for circular physics bodies
    const hw = o.radius * 1.15;
    const hh = o.radius * 0.85;
    const g = ctx.createLinearGradient(o.x, o.y - hh, o.x, o.y + hh);
    g.addColorStop(0, "#f5fbff");
    g.addColorStop(1, "#9cc7de");
    ctx.fillStyle = g;
    roundRect(ctx, o.x - hw, o.y - hh, hw * 2, hh * 2, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawPieces(ctx: CanvasRenderingContext2D, match: Match): void {
  // draw shadows first, then bodies (back-to-front by y)
  const alive = match.pieces.filter((p) => p.alive).sort((a, b) => a.y - b.y);
  for (const piece of alive) {
    drawPieceShadow(ctx, piece);
  }
  for (const piece of alive) {
    drawPiece(ctx, piece);
  }
}

function drawPieceShadow(ctx: CanvasRenderingContext2D, piece: Piece): void {
  ctx.fillStyle = "rgba(40, 70, 100, 0.22)";
  ctx.beginPath();
  ctx.ellipse(
    piece.x,
    piece.y + piece.radius * 0.55,
    piece.radius * 0.95,
    piece.radius * 0.35,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

function drawPiece(ctx: CanvasRenderingContext2D, piece: Piece): void {
  const r = piece.radius;
  const pal = piece.side === "red" ? WARM : COOL;
  const x = piece.x;
  const y = piece.y;

  // white puck base
  const puckG = ctx.createLinearGradient(x, y - r * 0.2, x, y + r);
  puckG.addColorStop(0, "#ffffff");
  puckG.addColorStop(1, "#d8e6ef");
  ctx.fillStyle = puckG;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.15, r, r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(160, 190, 210, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // character body (sitting on puck)
  const by = y - r * 0.15;
  const br = r * 0.72;
  const bodyG = ctx.createRadialGradient(x - br * 0.3, by - br * 0.35, 1, x, by, br);
  bodyG.addColorStop(0, lighten(pal.body, 0.25));
  bodyG.addColorStop(1, pal.body);
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.arc(x, by, br, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  const eyeY = by - br * 0.08;
  const eyeDx = br * 0.28;
  ctx.fillStyle = "#2a2a2a";
  ctx.beginPath();
  ctx.ellipse(x - eyeDx, eyeY, br * 0.12, br * 0.16, 0, 0, Math.PI * 2);
  ctx.ellipse(x + eyeDx, eyeY, br * 0.12, br * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x - eyeDx - 1, eyeY - 2, br * 0.045, 0, Math.PI * 2);
  ctx.arc(x + eyeDx - 1, eyeY - 2, br * 0.045, 0, Math.PI * 2);
  ctx.fill();

  // cheeks
  ctx.fillStyle = pal.cheek;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(x - eyeDx * 1.55, eyeY + br * 0.22, br * 0.14, br * 0.08, 0, 0, Math.PI * 2);
  ctx.ellipse(x + eyeDx * 1.55, eyeY + br * 0.22, br * 0.14, br * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // tiny role badge on puck rim
  const label =
    piece.role === "general" ? generalLabel(piece.side) : ROLE_LABEL[piece.role];
  ctx.fillStyle = pal.accent;
  ctx.beginPath();
  ctx.arc(x + r * 0.55, y + r * 0.35, Math.max(6, r * 0.38), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.max(8, Math.round(r * 0.42))}px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + r * 0.55, y + r * 0.35 + 0.5);
}

function drawAim(ctx: CanvasRenderingContext2D, match: Match, aim: AimState): void {
  const visual = getAimVisual(aim, match);
  if (!visual) return;

  const { x, y, dx, dy, power } = visual;
  const len = Math.min(TUNING.maxDrag, Math.hypot(dx, dy));
  if (len < 2) return;

  const hyp = Math.hypot(dx, dy) || 1;
  const nx = dx / hyp;
  const ny = dy / hyp;
  const ringR = 16 + power * 28;

  // green dotted power ring (rage later → warm)
  ctx.strokeStyle = `rgba(60, 200, 90, ${0.45 + power * 0.45})`;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(x, y, ringR, 0, Math.PI * 2);
  ctx.stroke();

  // crosshair
  ctx.setLineDash([]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - ringR - 6, y);
  ctx.lineTo(x + ringR + 6, y);
  ctx.moveTo(x, y - ringR - 6);
  ctx.lineTo(x, y + ringR + 6);
  ctx.stroke();

  // dotted flight direction
  const tipX = x + nx * (24 + power * 80);
  const tipY = y + ny * (24 + power * 80);
  ctx.setLineDash([5, 6]);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.setLineDash([]);

  // pull ghost
  ctx.setLineDash([3, 5]);
  ctx.strokeStyle = "rgba(60, 200, 90, 0.3)";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - nx * len, y - ny * len);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawHud(ctx: CanvasRenderingContext2D, match: Match): void {
  const redCount = alivePieces(match, "red").length;
  const blueCount = alivePieces(match, "blue").length;
  const turnLabel = match.turn === "red" ? "红方" : "蓝方";
  const phaseLabel =
    match.phase === "aim"
      ? "瞄准"
      : match.phase === "simulate"
        ? "滑动中…"
        : match.phase === "over"
          ? "结束"
          : "放置";

  const pad = 14;
  const sideW = 100;
  const barH = 44;
  const midW = TUNING.board.w - sideW * 2 - pad * 4;
  const midX = pad * 2 + sideW;

  // wood / ice plaque look
  drawPlaque(ctx, pad, 10, sideW, barH);
  drawPlaque(ctx, TUNING.board.w - pad - sideW, 10, sideW, barH);
  drawPlaque(ctx, midX, 10, midW, barH);

  ctx.font = '600 15px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  ctx.fillStyle = WARM.accent;
  ctx.fillText(`红 ${redCount}`, pad + sideW / 2, 32);

  ctx.fillStyle = COOL.accent;
  ctx.fillText(`${blueCount} 蓝`, TUNING.board.w - pad - sideW / 2, 32);

  ctx.fillStyle = "#3a4a55";
  ctx.font = '600 13px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
  if (match.phase === "over" && match.winner) {
    const win = match.winner === "red" ? "红方胜利！" : "蓝方胜利！";
    ctx.fillText(win, TUNING.board.w / 2, 24);
    ctx.font = '400 11px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
    ctx.fillStyle = "#5a6a75";
    ctx.fillText("按 R 重新开始", TUNING.board.w / 2, 40);
  } else {
    ctx.fillText(`${turnLabel} · ${phaseLabel}`, TUNING.board.w / 2, 24);
    const ratio = match.turnMsLeft / TUNING.turnMs;
    const meterW = midW - 28;
    const meterX = midX + 14;
    ctx.fillStyle = "rgba(80, 110, 130, 0.2)";
    roundRect(ctx, meterX, 34, meterW, 8, 4);
    ctx.fill();
    ctx.fillStyle = match.turn === "red" ? WARM.accent : COOL.accent;
    roundRect(ctx, meterX, 34, meterW * ratio, 8, 4);
    ctx.fill();
  }
}

function drawPlaque(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = "#f3e6d0";
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = "#c4a574";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1;
  roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 8);
  ctx.stroke();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + Math.round(255 * amount));
  const g = Math.min(255, ((n >> 8) & 255) + Math.round(255 * amount));
  const b = Math.min(255, (n & 255) + Math.round(255 * amount));
  return `rgb(${r},${g},${b})`;
}
