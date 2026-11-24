import { Peer, type DataConnection } from "peerjs";
import { normalizeRoomCode, peerIdForRoom, randomRoomCode } from "./codes";
import { decode, encode, type NetMsg } from "./protocol";

export type RoomRole = "host" | "guest" | "spectator";

export interface RoomSession {
  role: RoomRole;
  roomCode: string;
  send: (msg: NetMsg) => void;
  broadcast: (msg: NetMsg) => void;
  close: () => void;
}

export interface RoomHandlers {
  onOpen?: (session: RoomSession) => void;
  onMessage?: (msg: NetMsg, from: DataConnection) => void;
  onPeerJoin?: (conn: DataConnection) => void;
  onPeerLeave?: (conn: DataConnection) => void;
  onStatus?: (text: string) => void;
  onError?: (err: string) => void;
}

function makePeer(id?: string): Peer {
  return id
    ? new Peer(id, { debug: 0 })
    : new Peer({ debug: 0 });
}

function waitOpen(peer: Peer): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!peer.destroyed && peer.open) {
      resolve();
      return;
    }
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      peer.off("open", onOpen);
      peer.off("error", onError);
    };
    peer.on("open", onOpen);
    peer.on("error", onError);
  });
}

/** Host creates a table and waits for players. */
export async function createRoom(handlers: RoomHandlers): Promise<RoomSession> {
  const roomCode = randomRoomCode(4);
  const peer = makePeer(peerIdForRoom(roomCode));
  const conns = new Set<DataConnection>();

  handlers.onStatus?.(`正在创建房间 ${roomCode}…`);

  try {
    await waitOpen(peer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "无法创建房间（房间号可能被占用，请重试）";
    handlers.onError?.(msg);
    peer.destroy();
    throw e;
  }

  const session: RoomSession = {
    role: "host",
    roomCode,
    send: () => {
      /* host uses broadcast */
    },
    broadcast: (msg) => {
      const raw = encode(msg);
      for (const c of conns) {
        if (c.open) c.send(raw);
      }
    },
    close: () => {
      for (const c of conns) c.close();
      peer.destroy();
    },
  };

  peer.on("connection", (conn) => {
    conns.add(conn);
    conn.on("open", () => {
      handlers.onStatus?.("有人加入了桌子");
      handlers.onPeerJoin?.(conn);
    });
    conn.on("data", (data) => {
      if (typeof data !== "string") return;
      const msg = decode(data);
      if (msg) handlers.onMessage?.(msg, conn);
    });
    conn.on("close", () => {
      conns.delete(conn);
      handlers.onPeerLeave?.(conn);
      handlers.onStatus?.(conns.size ? "有人离开了桌子" : "对手已离开，等待加入…");
    });
  });

  peer.on("error", (err) => {
    handlers.onError?.(err.message);
  });

  handlers.onStatus?.(`房间 ${roomCode} 已就绪，等待对手…`);
  handlers.onOpen?.(session);
  return session;
}

/** Guest / spectator joins an existing host table. */
export async function joinRoom(
  rawCode: string,
  handlers: RoomHandlers,
  asSpectator = false,
): Promise<RoomSession> {
  const roomCode = normalizeRoomCode(rawCode);
  if (!roomCode) {
    const err = "房间号无效";
    handlers.onError?.(err);
    throw new Error(err);
  }

  const peer = makePeer();
  handlers.onStatus?.(`正在加入 ${roomCode}…`);

  try {
    await waitOpen(peer);
  } catch (e) {
    handlers.onError?.(e instanceof Error ? e.message : "连接失败");
    peer.destroy();
    throw e;
  }

  const conn = peer.connect(peerIdForRoom(roomCode), { reliable: true });

  await new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("加入超时：找不到该房间")), 12_000);
    conn.on("open", () => {
      window.clearTimeout(t);
      resolve();
    });
    conn.on("error", (err) => {
      window.clearTimeout(t);
      reject(err);
    });
    peer.on("error", (err) => {
      window.clearTimeout(t);
      reject(err);
    });
  });

  const session: RoomSession = {
    role: asSpectator ? "spectator" : "guest",
    roomCode,
    send: (msg) => {
      if (conn.open) conn.send(encode(msg));
    },
    broadcast: (msg) => session.send(msg),
    close: () => {
      conn.close();
      peer.destroy();
    },
  };

  conn.on("data", (data) => {
    if (typeof data !== "string") return;
    const msg = decode(data);
    if (msg) handlers.onMessage?.(msg, conn);
  });
  conn.on("close", () => {
    handlers.onStatus?.("与房主断开");
    handlers.onPeerLeave?.(conn);
  });

  session.send({ type: "hello", role: asSpectator ? "spectator" : "guest" });
  handlers.onOpen?.(session);
  handlers.onStatus?.(`已加入房间 ${roomCode}`);
  return session;
}
