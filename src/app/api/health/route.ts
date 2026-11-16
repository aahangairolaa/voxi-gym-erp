import { db } from "@/server/db";

/** GET /api/health → quick check that the app and database are up */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, database: "connected", time: new Date().toISOString() });
  } catch {
    return Response.json({ ok: false, database: "unreachable" }, { status: 503 });
  }
}
