/**
 * Cloudflare Pages Function + KV room directory.
 * Binding name: ROOMS (KV namespace).
 *
 * GET    /api/rooms
 * POST   /api/rooms  { code, status, seats }
 * DELETE /api/rooms?code=ABCD
 */

interface RoomListing {
  code: string;
  status: "waiting" | "playing";
  seats: number;
  updatedAt: number;
}

interface Env {
  ROOMS: KVNamespace;
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

export const onRequestOptions: PagesFunction = async () =>
  json({ ok: true });

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.ROOMS) {
    return json({ rooms: [], warning: "ROOMS KV not bound" });
  }
  const listed = await ctx.env.ROOMS.list({ prefix: PREFIX });
  const rooms: RoomListing[] = [];
  for (const key of listed.keys) {
    const row = await ctx.env.ROOMS.get<RoomListing>(key.name, "json");
    if (row?.code) rooms.push(row);
  }
  rooms.sort((a, b) => b.updatedAt - a.updatedAt);
  return json({ rooms });
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.ROOMS) return json({ ok: false, error: "no KV" }, 500);
  let body: { code?: string; status?: string; seats?: number };
  try {
    body = (await ctx.request.json()) as typeof body;
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
  await ctx.env.ROOMS.put(`${PREFIX}${code}`, JSON.stringify(row), {
    expirationTtl: TTL_SEC,
  });
  return json({ ok: true, room: row });
};

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.ROOMS) return json({ ok: false, error: "no KV" }, 500);
  const code = new URL(ctx.request.url).searchParams.get("code")?.toUpperCase();
  if (!code) return json({ ok: false, error: "missing code" }, 400);
  await ctx.env.ROOMS.delete(`${PREFIX}${code}`);
  return json({ ok: true });
};
