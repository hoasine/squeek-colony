import { z } from "zod";
import { readSession } from "@/lib/auth";
import { ACTIONS } from "@/lib/game";
import { ensureWorld } from "@/lib/world";
import { db } from "@/lib/db";

const inputSchema = z.object({ action: z.enum(ACTIONS) });

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) {
    return Response.json({ error: "Connect your wallet to join the council." }, { status: 401 });
  }
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return Response.json({ error: "Unknown colony action." }, { status: 400 });
  }

  const { round } = await ensureWorld();
  if (round.endsAt <= new Date()) {
    return Response.json({ error: "This round is already locked." }, { status: 409 });
  }

  const existing = await db.action.findUnique({
    where: { playerId_roundId: { playerId: session.playerId, roundId: round.id } },
  });
  const action = await db.action.upsert({
    where: { playerId_roundId: { playerId: session.playerId, roundId: round.id } },
    update: { kind: input.data.action },
    create: { playerId: session.playerId, roundId: round.id, kind: input.data.action },
  });
  if (!existing) {
    await db.player.update({
      where: { id: session.playerId },
      data: { xp: { increment: 10 } },
    });
  }

  return Response.json({ action: action.kind, round: round.chainRound });
}
