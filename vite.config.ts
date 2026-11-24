import { defineConfig, type Plugin } from "vite";
import type { RoomListing } from "./src/net/directory";

/** In-memory room directory for `npm run dev` (mirrors Pages Function + KV). */
function localRoomDirectory(): Plugin {
  const rooms = new Map<string, RoomListing>();
  const TTL_MS = 45_000;

  function prune(): void {
    const now = Date.now();
    for (const [k, v] of rooms) {
      if (now - v.updatedAt > TTL_MS) rooms.delete(k);
    }
  }

  return {
    name: "local-room-directory",
    configureServer(server) {
      server.middlewares.use("/api/rooms", (req, res, next) => {
        prune();
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.setHeader("cache-control", "no-store");

        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.end("{}");
          return;
        }

        if (req.method === "GET") {
          const list = [...rooms.values()].sort((a, b) => b.updatedAt - a.updatedAt);
          res.end(JSON.stringify({ rooms: list }));
          return;
        }

        if (req.method === "DELETE") {
          const url = new URL(req.url ?? "", "http://local");
          const code = url.searchParams.get("code")?.toUpperCase();
          if (code) rooms.delete(code);
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        if (req.method === "POST") {
          let raw = "";
          req.on("data", (c) => {
            raw += c;
          });
          req.on("end", () => {
            try {
              const body = JSON.parse(raw) as {
                code?: string;
                status?: string;
                seats?: number;
              };
              const code = String(body.code ?? "")
                .trim()
                .toUpperCase()
                .replace(/[^0-9A-Z]/g, "");
              if (code.length < 3 || code.length > 6) {
                res.statusCode = 400;
                res.end(JSON.stringify({ ok: false }));
                return;
              }
              const row: RoomListing = {
                code,
                status: body.status === "playing" ? "playing" : "waiting",
                seats: Math.max(1, Math.min(2, Number(body.seats) || 1)),
                updatedAt: Date.now(),
              };
              rooms.set(code, row);
              res.end(JSON.stringify({ ok: true, room: row }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [localRoomDirectory()],
});
