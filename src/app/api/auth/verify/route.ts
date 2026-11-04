import { cookies } from "next/headers";
import { getAddress, isAddress, verifyMessage } from "viem";
import { z } from "zod";
import { createSessionToken, sessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";

const inputSchema = z.object({
  address: z.string(),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

export async function POST(request: Request) {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success || !isAddress(input.data.address)) {
    return Response.json({ error: "Invalid verification request." }, { status: 400 });
  }

  const address = getAddress(input.data.address);
  const challenge = await db.authChallenge.findUnique({
    where: { address: address.toLowerCase() },
  });
  if (!challenge || challenge.expiresAt < new Date()) {
    return Response.json({ error: "Challenge expired. Please try again." }, { status: 401 });
  }

  const valid = await verifyMessage({
    address,
    message: challenge.message,
    signature: input.data.signature as `0x${string}`,
  }).catch(() => false);
  if (!valid) {
    return Response.json({ error: "Signature could not be verified." }, { status: 401 });
  }

  const player = await db.player.upsert({
    where: { address: address.toLowerCase() },
    update: {},
    create: { address: address.toLowerCase() },
  });
  await db.authChallenge.delete({ where: { address: address.toLowerCase() } });
  const token = await createSessionToken({
    address: address as `0x${string}`,
    playerId: player.id,
  });
  (await cookies()).set(sessionCookie(token));

  return Response.json({ player: { address, id: player.id, xp: player.xp } });
}
