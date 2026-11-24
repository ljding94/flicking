/** Unambiguous chars (no 0/O/1/I). */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function randomRoomCode(len = 4): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

export function normalizeRoomCode(input: string): string | null {
  const code = input.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (code.length < 3 || code.length > 6) return null;
  return code;
}

/** Stable PeerJS id for a table — host owns this id. */
export function peerIdForRoom(code: string): string {
  return `flicking-table-${code}`;
}
