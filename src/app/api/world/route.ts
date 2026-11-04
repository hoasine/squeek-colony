import { readSession } from "@/lib/auth";
import { getWorld } from "@/lib/world";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await readSession();
    return Response.json(await getWorld(session?.playerId));
  } catch (error) {
    console.error("Unable to load colony", error);
    return Response.json({ error: "The colony signal is unavailable." }, { status: 503 });
  }
}
