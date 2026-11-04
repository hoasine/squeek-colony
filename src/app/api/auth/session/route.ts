import { cookies } from "next/headers";
import { clearSessionCookie, readSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await readSession();
  if (!session) return Response.json({ player: null });
  const player = await db.player.findUnique({
    where: { id: session.playerId },
    select: { id: true, address: true, displayName: true, xp: true },
  });
  return Response.json({ player });
}

export async function DELETE() {
  (await cookies()).set(clearSessionCookie());
  return Response.json({ ok: true });
}
