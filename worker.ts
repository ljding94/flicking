/**
 * Cloudflare Worker: static Vite assets + /api/rooms directory (KV).
 * Lets CI `wrangler deploy` succeed (Pages-only config breaks that command).
 */

interface RoomListing {
  code: string;
  status: "waiting" | "playing";
  seats: number;
  updatedAt: number;
}

export interface Env {
  ROOMS: KVNamespace;
  ASSETS: Fetcher;
}

const PREFIX = "room:";
const TTL_SEC = 45;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

async function handleRooms(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") return json({ ok: true });

  if (!env.ROOMS) {
    return json({ rooms: [], warning: "ROOMS KV not bound" });
  }

  if (request.method === "GET") {
    const listed = await env.ROOMS.list({ prefix: PREFIX });
    const rooms: RoomListing[] = [];
    for (const key of listed.keys) {
      const row = await env.ROOMS.get<RoomListing>(key.name, "json");
      if (row?.code) rooms.push(row);
    }
    rooms.sort((a, b) => b.updatedAt - a.updatedAt);
    return json({ rooms });
  }

  if (request.method === "POST") {
    let body: { code?: string; status?: string; seats?: number };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ ok: false, error: "bad json" }, 400);
    }
    const code = String(body.code ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, "");
    if (code.length < 3 || code.length > 6) {
      return json({ ok: false, error: "bad code" }, 400);
    }
    const status = body.status === "playing" ? "playing" : "waiting";
    const seats = Math.max(1, Math.min(2, Number(body.seats) || 1));
    const row: RoomListing = {
      code,
      status,
      seats,
      updatedAt: Date.now(),
    };
    await env.ROOMS.put(`${PREFIX}${code}`, JSON.stringify(row), {
      expirationTtl: TTL_SEC,
    });
    return json({ ok: true, room: row });
  }

  if (request.method === "DELETE") {
    const code = new URL(request.url).searchParams.get("code")?.toUpperCase();
    if (!code) return json({ ok: false, error: "missing code" }, 400);
    await env.ROOMS.delete(`${PREFIX}${code}`);
    return json({ ok: true });
  }

  return json({ ok: false, error: "method not allowed" }, 405);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/rooms") {
      return handleRooms(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
