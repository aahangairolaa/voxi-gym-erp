import { route } from "@/server/http";
import { requireGym } from "@/server/auth";
import { db } from "@/server/db";

/** GET /api/staff/sellers → everyone who can be chosen as "Sold by" (active staff, names only) */
export const GET = route(async () => {
  const s = await requireGym();
  const staff = await db.staff.findMany({
    where: { gymId: s.gymId, isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: [{ name: "asc" }],
  });
  return { staff };
});
