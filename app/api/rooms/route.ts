import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { rooms } from "@/db/schema";
import { replayMoves, saveMove, type SavedMove } from "@/lib/chess-engine";

export const runtime = "edge";
const roomId = z.string().regex(/^[A-Z0-9]{6}$/);
const square = z.string().regex(/^[a-h][1-8]$/);
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create") }),
  z.object({ action: z.literal("join"), id: roomId }),
  z.object({ action: z.literal("move"), id: roomId, token: z.string().length(32), revision: z.number().int().nonnegative(), from: square, to: square, promotion: z.enum(["q", "r", "b", "n"]).optional() }),
]);
function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
function token() { return crypto.randomUUID().replaceAll("-", ""); }
function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), value => alphabet[value % alphabet.length]).join("");
}
function snapshot(room: typeof rooms.$inferSelect) {
  return { id: room.id, fen: room.fen, moves: JSON.parse(room.moves) as SavedMove[], revision: room.revision, ready: room.guestToken !== null };
}

export async function POST(req: NextRequest) {
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return reply({ error: "Invalid room request." }, 400);
  const body = parsed.data;
  try {
    const db = getDb();
    if (body.action === "create") {
      for (let attempt = 0; attempt < 4; attempt++) {
        const id = makeCode(), hostToken = token();
        const created = await db.insert(rooms).values({ id, fen: replayMoves([]).fen(), hostToken, updatedAt: Date.now() }).onConflictDoNothing().returning();
        if (created[0]) return reply({ ...snapshot(created[0]), token: hostToken });
      }
      return reply({ error: "Please try creating a room again." }, 503);
    }
    const room = await db.query.rooms.findFirst({ where: eq(rooms.id, body.id) });
    if (!room) return reply({ error: "Room not found." }, 404);
    if (body.action === "join") {
      const guestToken = token();
      const joined = await db.update(rooms).set({ guestToken, updatedAt: Date.now() }).where(and(eq(rooms.id, room.id), isNull(rooms.guestToken))).returning();
      if (!joined[0]) return reply({ error: "Room is full." }, 409);
      return reply({ ...snapshot(joined[0]), token: guestToken });
    }
    const side = body.token === room.hostToken ? "w" : body.token === room.guestToken ? "b" : null;
    if (!side) return reply({ error: "Invalid player token." }, 403);
    if (!room.guestToken) return reply({ error: "Wait for a challenger to join." }, 409);
    if (body.revision !== room.revision) return reply({ error: "The board changed. Wait for it to refresh." }, 409);
    const history = JSON.parse(room.moves) as SavedMove[];
    const game = replayMoves(history);
    if (game.isGameOver()) return reply({ error: "This game is finished." }, 409);
    if (game.turn() !== side) return reply({ error: "Wait for your turn." }, 409);
    let move;
    try { move = game.move({ from: body.from, to: body.to, promotion: body.promotion }); }
    catch { return reply({ error: "Illegal move." }, 400); }
    const changed = await db.update(rooms).set({ fen: game.fen(), moves: JSON.stringify([...history, saveMove(move)]), revision: room.revision + 1, updatedAt: Date.now() }).where(and(eq(rooms.id, room.id), eq(rooms.revision, room.revision))).returning();
    if (!changed[0]) return reply({ error: "The board changed. Wait for it to refresh." }, 409);
    return reply(snapshot(changed[0]));
  } catch (error) {
    console.error("Room request failed", error instanceof Error ? error.message : "Unknown error");
    return reply({ error: "Online rooms are temporarily unavailable. Please try again." }, 503);
  }
}
export async function GET(req: NextRequest) {
  const id = roomId.safeParse(req.nextUrl.searchParams.get("id")?.toUpperCase());
  if (!id.success) return reply({ error: "Invalid room code." }, 400);
  try {
    const room = await getDb().query.rooms.findFirst({ where: eq(rooms.id, id.data) });
    return room ? reply(snapshot(room)) : reply({ error: "Room not found." }, 404);
  } catch {
    return reply({ error: "Online rooms are temporarily unavailable." }, 503);
  }
}
