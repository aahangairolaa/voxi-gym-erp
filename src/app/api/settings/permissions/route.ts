import { z } from "zod";
import { route, readBody } from "@/server/http";
import { forgetAccess, requireGym } from "@/server/auth";
import { db } from "@/server/db";
import { audit } from "@/server/services/audit.service";
import { CONFIGURABLE_ROLES, PERMISSIONS, type RolePermissions } from "@/lib/permissions";

const keys = PERMISSIONS.map((p) => p.key) as [string, ...string[]];
const schema = z.object({
  permissions: z.record(z.enum(["MANAGER", "RECEPTION", "TRAINER"]), z.record(z.enum(keys), z.boolean())),
});

/** GET /api/settings/permissions → the owner's choices for confidential features per role */
export const GET = route(async () => {
  const s = await requireGym("settings");
  const g = await db.gym.findUniqueOrThrow({ where: { id: s.gymId }, select: { rolePermissions: true } });
  return { permissions: (g.rolePermissions as RolePermissions | null) ?? {} };
});

/** PUT /api/settings/permissions { permissions: { RECEPTION: { revenue: true } } } (owner only) */
export const PUT = route(async (req) => {
  const s = await requireGym("settings");
  const { permissions } = await readBody(req, schema);
  // Keep only switches a role can actually have
  const clean: RolePermissions = {};
  for (const role of CONFIGURABLE_ROLES) {
    for (const p of PERMISSIONS) {
      const v = permissions[role as "MANAGER"]?.[p.key];
      if (typeof v === "boolean" && p.roles.includes(role)) (clean[role] ??= {})[p.key] = v;
    }
  }
  await db.gym.update({ where: { id: s.gymId }, data: { rolePermissions: clean } });
  forgetAccess(); // apply to everyone signed in right away
  await audit(s, "settings.permissions", "Gym", s.gymId, "Changed what each role can access");
  return { permissions: clean };
});
