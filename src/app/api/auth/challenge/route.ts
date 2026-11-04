import { randomBytes } from "node:crypto";
import { getAddress, isAddress } from "viem";
import { z } from "zod";
import { db } from "@/lib/db";

const inputSchema = z.object({ address: z.string() });

export async function POST(request: Request) {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success || !isAddress(input.data.address)) {
    return Response.json({ error: "Invalid wallet address." }, { status: 400 });
  }

  const address = getAddress(input.data.address);
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + 5 * 60_000);
  const domain = new URL(request.url).host;
  const message = [
    "Welcome to Squeek Colony.",
    "",
    "Sign this message to prove this wallet is yours. This is free and does not send a transaction.",
    "",
    `Domain: ${domain}`,
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued at: ${issuedAt.toISOString()}`,
    `Expires at: ${expiresAt.toISOString()}`,
  ].join("\n");

  await db.authChallenge.upsert({
    where: { address: address.toLowerCase() },
    update: { nonce, message, expiresAt },
    create: { address: address.toLowerCase(), nonce, message, expiresAt },
  });

  return Response.json({ message, expiresAt: expiresAt.toISOString() });
}
