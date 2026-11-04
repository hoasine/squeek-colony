import { db } from "@/lib/db";
import { getSqueekStatus } from "@/lib/squeekchain";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    const [status] = await Promise.all([
      getSqueekStatus(),
      db.colony.count(),
    ]);
    return Response.json({
      ok: true,
      database: "ready",
      squeekchain: status.source,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return Response.json(
      {
        ok: false,
        database: "unavailable",
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
