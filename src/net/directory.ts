export type RoomStatus = "waiting" | "playing";

export interface RoomListing {
  code: string;
  status: RoomStatus;
  /** 1 = host alone, 2 = both seats filled */
  seats: number;
  updatedAt: number;
}

const API = "/api/rooms";

export async function fetchRoomList(): Promise<RoomListing[]> {
  try {
    const res = await fetch(API, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { rooms?: RoomListing[] };
    return Array.isArray(data.rooms) ? data.rooms : [];
  } catch {
    return [];
  }
}

export async function publishRoom(
  code: string,
  status: RoomStatus,
  seats: number,
): Promise<void> {
  try {
    await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, status, seats }),
    });
  } catch {
    // directory is best-effort; PeerJS table still works
  }
}

export async function unpublishRoom(code: string): Promise<void> {
  try {
    await fetch(`${API}?code=${encodeURIComponent(code)}`, { method: "DELETE" });
  } catch {
    // ignore
  }
}

/** Keep a host table visible in the lobby directory. */
export function startRoomHeartbeat(
  code: string,
  getState: () => { status: RoomStatus; seats: number },
): () => void {
  let stopped = false;

  const beat = () => {
    if (stopped) return;
    const s = getState();
    void publishRoom(code, s.status, s.seats);
  };

  beat();
  const id = window.setInterval(beat, 12_000);
  return () => {
    stopped = true;
    window.clearInterval(id);
    void unpublishRoom(code);
  };
}
