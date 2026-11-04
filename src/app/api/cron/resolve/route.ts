import { settleDueRounds } from "@/lib/settlement";
import { ensureWorld } from "@/lib/world";

export async function POST(request: Request) {
  const provided = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || provided !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    await ensureWorld();
    return Response.json(await settleDueRounds());
  } catch {
    return Response.json({ error: "Settlement feed unavailable." }, { status: 503 });
  }
}
