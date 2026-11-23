import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { requireRole } from "@/server/auth";
import { exportGym } from "@/server/services/platform.service";

/** GET /api/admin/gyms/:id/export → downloads all of the gym's data as one JSON file (no photos or passwords) */
export const GET = route<{ id: string }>(async (_req, { id }) => {
  await requireRole("SUPER_ADMIN");
  const data = await exportGym(id);
  const slug = (data.gym.slug as string) || "gym";
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="voxi-${slug}-${day}.json"`,
    },
  });
});
