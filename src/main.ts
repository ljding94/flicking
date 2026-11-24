import "./style.css";
import { TUNING } from "./game/tuning";
import { createMatch } from "./game/setup";
import { startPlay, type PlaySession } from "./game/play";
import type { Side } from "./game/types";
import { createAimState } from "./input/aim";
import { drawFrame } from "./render/draw";
import { createRoom, joinRoom, type RoomSession } from "./net/room";
import {
  fetchRoomList,
  startRoomHeartbeat,
  type RoomListing,
  type RoomStatus,
} from "./net/directory";
import type { DataConnection } from "peerjs";
import { encode, type NetMsg } from "./net/protocol";

const app = document.querySelector<HTMLDivElement>("#app")!;
const TITLE = "强力弹棋";

let room: RoomSession | null = null;
let play: PlaySession | null = null;
let guestConn: DataConnection | null = null;
const spectatorConns = new Set<DataConnection>();
let stopHeartbeat: (() => void) | null = null;
let lobbyPoll: number | null = null;
let hostSeats = 1;
let hostStatus: RoomStatus = "waiting";

function stopLobbyPoll(): void {
  if (lobbyPoll != null) {
    window.clearInterval(lobbyPoll);
    lobbyPoll = null;
  }
}

function clearHeartbeat(): void {
  stopHeartbeat?.();
  stopHeartbeat = null;
}

function shell(inner: string, opts?: { hideBrand?: boolean }): string {
  const brand = opts?.hideBrand
    ? ""
    : `<header class="top">
      <h1>${TITLE}</h1>
      <p>拉回蓄力 · 松手弹出 · 把对方打出冰面</p>
    </header>`;
  return `<div class="shell">${brand}${inner}</div>`;
}

function paintLobbyDesk(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const match = createMatch("classic");
  drawFrame(ctx, match, createAimState());
}

function roomRowHtml(r: RoomListing): string {
  const label = r.status === "waiting" ? "等人" : "对局中";
  const seats = `${r.seats}/2`;
  const asPlayer = r.status === "waiting" && r.seats < 2;
  const action = asPlayer ? "加入" : "观战";
  return `
    <li class="room-row" data-code="${escapeHtml(r.code)}">
      <div class="room-row-main">
        <span class="room-row-code">${escapeHtml(r.code)}</span>
        <span class="room-row-meta">${label} · ${seats}</span>
      </div>
      <button type="button" class="btn small ${asPlayer ? "primary" : ""}" data-join="${escapeHtml(r.code)}" data-seat="${asPlayer ? "player" : "spectator"}">
        ${action}
      </button>
    </li>`;
}

async function refreshRoomList(): Promise<void> {
  const listEl = document.getElementById("room-list");
  const emptyEl = document.getElementById("room-list-empty");
  if (!listEl) return;
  const rooms = await fetchRoomList();
  if (rooms.length === 0) {
    listEl.innerHTML = "";
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;
  listEl.innerHTML = rooms.map(roomRowHtml).join("");
  listEl.querySelectorAll<HTMLButtonElement>("[data-join]").forEach((btn) => {
    btn.onclick = () => {
      const code = btn.getAttribute("data-join");
      const seat = btn.getAttribute("data-seat");
      if (code) void startGuest(code, seat === "spectator");
    };
  });
}

function showLobby(error = ""): void {
  teardownPlay();
  clearHeartbeat();
  room?.close();
  room = null;
  guestConn = null;
  spectatorConns.clear();
  hostSeats = 1;
  hostStatus = "waiting";

  app.innerHTML = shell(
    `
    <div class="stage">
      <canvas id="lobby-desk" class="desk-bg" width="${TUNING.board.w}" height="${TUNING.board.h}"></canvas>
      <div class="lobby-window">
        <h2 class="lobby-title">${TITLE}</h2>
        <p class="lobby-lead">不用登录。开一桌，把房间号发给朋友即可开打。</p>
        ${error ? `<p class="lobby-error">${escapeHtml(error)}</p>` : ""}
        <div class="lobby-actions">
          <button type="button" class="btn primary" id="btn-local">同屏双人</button>
          <button type="button" class="btn primary" id="btn-create">创建房间</button>
        </div>
        <form class="join-row" id="join-form">
          <input id="join-code" name="code" maxlength="6" placeholder="房间号" autocomplete="off" spellcheck="false" />
          <button type="submit" class="btn">加入</button>
        </form>
        <div class="room-dir">
          <div class="room-dir-head">
            <span>开放房间</span>
            <button type="button" class="btn small" id="btn-refresh">刷新</button>
          </div>
          <p class="room-list-empty" id="room-list-empty">暂无开放房间，来开第一桌吧</p>
          <ul class="room-list" id="room-list"></ul>
        </div>
        <p class="lobby-note">联机：房主红方 · 加入者蓝方 · 第三人起为观战</p>
      </div>
    </div>
  `,
    { hideBrand: true },
  );

  const desk = document.querySelector<HTMLCanvasElement>("#lobby-desk");
  if (desk) paintLobbyDesk(desk);

  document.getElementById("btn-local")!.onclick = () => startLocal();
  document.getElementById("btn-create")!.onclick = () => void startHost();
  document.getElementById("btn-refresh")!.onclick = () => void refreshRoomList();
  document.getElementById("join-form")!.onsubmit = (e) => {
    e.preventDefault();
    const code = (document.getElementById("join-code") as HTMLInputElement).value;
    void startGuest(code);
  };

  void refreshRoomList();
  stopLobbyPoll();
  lobbyPoll = window.setInterval(() => void refreshRoomList(), 5000);
}

function showWaiting(code: string): void {
  stopLobbyPoll();
  app.innerHTML = shell(
    `
    <div class="stage">
      <canvas id="lobby-desk" class="desk-bg" width="${TUNING.board.w}" height="${TUNING.board.h}"></canvas>
      <div class="lobby-window">
        <h2 class="lobby-title">房间已创建</h2>
        <div class="room-code" id="room-code">${escapeHtml(code)}</div>
        <p class="status-line" id="status-line">等待对手加入…</p>
        <div class="lobby-actions">
          <button type="button" class="btn" id="btn-copy">复制房间号</button>
          <button type="button" class="btn" id="btn-back">返回</button>
        </div>
        <p class="lobby-note">把房间号发给朋友，或等他们从房间列表点加入。</p>
      </div>
    </div>
  `,
    { hideBrand: true },
  );

  const desk = document.querySelector<HTMLCanvasElement>("#lobby-desk");
  if (desk) paintLobbyDesk(desk);

  document.getElementById("btn-copy")!.onclick = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("已复制房间号");
    } catch {
      setStatus("复制失败，请手动选中房间号");
    }
  };
  document.getElementById("btn-back")!.onclick = () => {
    clearHeartbeat();
    room?.close();
    room = null;
    showLobby();
  };
}

function showPlay(footerLeft: string, hintRight: string): void {
  stopLobbyPoll();
  app.innerHTML = shell(`
    <canvas id="board" width="${TUNING.board.w}" height="${TUNING.board.h}"></canvas>
    <footer class="hint">
      <span id="status-line">${footerLeft}</span>
      <span id="hint-right">${hintRight}</span>
    </footer>
    <div class="play-bar">
      <button type="button" class="btn small" id="btn-leave">离开桌子</button>
    </div>
  `);
  document.getElementById("btn-leave")!.onclick = () => {
    clearHeartbeat();
    teardownPlay();
    room?.close();
    room = null;
    showLobby();
  };
}

function setStatus(text: string): void {
  const el = document.getElementById("status-line");
  if (el) el.textContent = text;
}

function teardownPlay(): void {
  play?.destroy();
  play = null;
}

function beginHostHeartbeat(code: string): void {
  clearHeartbeat();
  stopHeartbeat = startRoomHeartbeat(code, () => ({
    status: hostStatus,
    seats: hostSeats,
  }));
}

function mountPlay(mode: "local" | "online-host" | "online-client", side: Side | null): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#board")!;
  play = startPlay(canvas, mode, side, {
    onMatchChanged: (match, reason) => {
      if (!room || room.role !== "host") return;
      if (reason === "tick") return;
      room.broadcast({ type: "state", match });
    },
    onFlickIntent: (flick) => {
      room?.send({ type: "flick", pieceId: flick.pieceId, vx: flick.vx, vy: flick.vy });
    },
  });
  play.setStatusEl(document.getElementById("status-line"));
}

function ensureHostPlaying(): void {
  if (play || !room) return;
  hostStatus = "playing";
  showPlay(`房间 ${room.roomCode} · 你是红方`, "R 重开 · Esc 取消瞄准");
  mountPlay("online-host", "red");
}

function sendWelcome(conn: DataConnection, seat: "player" | "spectator"): void {
  if (!room || !play) return;
  const msg: NetMsg = {
    type: "welcome",
    side: "blue",
    seat,
    match: play.getMatch(),
    roomCode: room.roomCode,
  };
  conn.send(encode(msg));
}

function handleHostMessage(msg: NetMsg, conn: DataConnection): void {
  if (!room) return;

  if (msg.type === "hello") {
    ensureHostPlaying();
    if (msg.role === "guest" && !guestConn) {
      guestConn = conn;
      hostSeats = 2;
      hostStatus = "playing";
      sendWelcome(conn, "player");
      setStatus("对手已入座 · 你是红方，先手");
    } else {
      spectatorConns.add(conn);
      sendWelcome(conn, "spectator");
      setStatus("有观战者加入");
    }
    return;
  }

  if (!play) return;

  if (msg.type === "flick") {
    if (conn !== guestConn) return;
    play.applyRemoteFlick({
      pieceId: msg.pieceId,
      vx: msg.vx,
      vy: msg.vy,
      power: 0,
    });
  }
}

function startLocal(): void {
  stopLobbyPoll();
  clearHeartbeat();
  showPlay("同屏双人 · 红方先手", "R 重开 · Esc 取消瞄准");
  mountPlay("local", null);
}

async function startHost(): Promise<void> {
  stopLobbyPoll();
  showWaiting("····");
  try {
    room = await createRoom({
      onStatus: setStatus,
      onError: (err) => {
        clearHeartbeat();
        showLobby(err);
      },
      onOpen: (session) => {
        showWaiting(session.roomCode);
        setStatus(`房间 ${session.roomCode} 已就绪，等待对手…`);
        hostSeats = 1;
        hostStatus = "waiting";
        beginHostHeartbeat(session.roomCode);
      },
      onMessage: (msg, conn) => handleHostMessage(msg, conn),
      onPeerLeave: (conn) => {
        if (conn === guestConn) {
          guestConn = null;
          hostSeats = 1;
          hostStatus = play ? "playing" : "waiting";
          setStatus("对手已离开，等待新玩家加入…");
        }
        spectatorConns.delete(conn);
      },
    });
  } catch {
    // surfaced via onError
  }
}

async function startGuest(code: string, asSpectator = false): Promise<void> {
  stopLobbyPoll();
  clearHeartbeat();
  app.innerHTML = shell(
    `
    <div class="lobby-window solo">
      <h2 class="lobby-title">正在加入房间…</h2>
      <p class="status-line" id="status-line">连接中</p>
      <button type="button" class="btn" id="btn-back">取消</button>
    </div>
  `,
    { hideBrand: true },
  );
  document.getElementById("btn-back")!.onclick = () => {
    room?.close();
    room = null;
    showLobby();
  };

  try {
    room = await joinRoom(
      code,
      {
        onStatus: setStatus,
        onError: (err) => showLobby(err),
        onMessage: (msg) => handleClientMessage(msg),
        onPeerLeave: () => {
          teardownPlay();
          room?.close();
          room = null;
          showLobby("房主已离开，请重新加入或创建房间");
        },
      },
      asSpectator,
    );
  } catch (e) {
    showLobby(e instanceof Error ? e.message : "加入失败");
  }
}

function handleClientMessage(msg: NetMsg): void {
  if (msg.type === "welcome") {
    const isPlayer = msg.seat === "player";
    showPlay(
      `房间 ${msg.roomCode} · ${isPlayer ? "你是蓝方" : "观战中"}`,
      isPlayer ? "Esc 取消瞄准" : "观战模式",
    );
    mountPlay("online-client", isPlayer ? msg.side : null);
    play?.applyRemoteMatch(msg.match);
    return;
  }
  if (msg.type === "state") {
    play?.applyRemoteMatch(msg.match);
  }
  if (msg.type === "error") {
    showLobby(msg.message);
  }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

showLobby();
