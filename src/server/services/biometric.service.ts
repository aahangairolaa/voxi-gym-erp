/**
 * Biometric integration
 * ─────────────────────
 * VOXI accepts scans from fingerprint / face / card devices in two ways:
 *
 *  1. Generic webhook  (recommended — works with any device or a small bridge app)
 *       POST /api/biometric/scan
 *       Header:  x-device-key: <key shown once when you register the device>
 *       Body:    { "biometricUserId": "1001", "scannedAt": "2026-11-12T18:30:00+03:00" }
 *       Reply:   { "allowed": true, "action": "IN", "member": {...} }  → open the turnstile if allowed
 *
 *  2. ZKTeco "ADMS / Push" protocol (many gyms in Qatar use ZKTeco terminals)
 *       Point the device's Cloud Server to your VOXI domain; it calls /iclock/cdata.
 *       The device is identified by its serial number, which must be registered in VOXI.
 *
 * See docs/BIOMETRIC.md for setup steps.
 */
import { createHash, randomBytes } from "node:crypto";
import type { z } from "zod";
import { db } from "../db";
import { ApiError } from "../http";
import type { deviceSchema } from "../validators";
import { recordAccess } from "./attendance.service";
import { fullName } from "./_shared";

type DeviceInput = z.infer<typeof deviceSchema>;

export function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function newKey() {
  return `vxk_${randomBytes(24).toString("hex")}`;
}

// ── Devices ─────────────────────────────────────────────────────────────────

export async function listDevices() {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const devices = await db.biometricDevice.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      branch: { select: { id: true, name: true } },
      _count: { select: { events: { where: { createdAt: { gte: since } } } } },
    },
  });
  return devices.map(({ apiKeyHash: _h, _count, ...d }) => ({
    ...d,
    scans24h: _count.events,
    online: !!d.lastSeenAt && Date.now() - d.lastSeenAt.getTime() < 10 * 60 * 1000,
  }));
}

/** Returns the plain API key ONCE — only its hash is stored. */
export async function createDevice(input: DeviceInput) {
  const key = newKey();
  const device = await db.biometricDevice.create({
    data: { ...input, apiKeyHash: hashKey(key), apiKeyHint: key.slice(-4) },
  });
  const { apiKeyHash: _h, ...safe } = device;
  return { device: safe, apiKey: key };
}

export async function updateDevice(id: string, input: DeviceInput) {
  const { apiKeyHash: _h, ...safe } = await db.biometricDevice.update({ where: { id }, data: input });
  return safe;
}

export async function rotateDeviceKey(id: string) {
  const key = newKey();
  await db.biometricDevice.update({ where: { id }, data: { apiKeyHash: hashKey(key), apiKeyHint: key.slice(-4) } });
  return { apiKey: key };
}

export async function deleteDevice(id: string) {
  await db.biometricDevice.delete({ where: { id } });
  return { ok: true };
}

// ── Enrollment ──────────────────────────────────────────────────────────────

export async function setEnrollment(memberId: string, biometricId: string | null) {
  return db.member.update({
    where: { id: memberId },
    data: { biometricId, biometricEnrolled: biometricId ? new Date() : null },
    select: { id: true, code: true, biometricId: true, biometricEnrolled: true },
  });
}

export async function listEnrollments() {
  const members = await db.member.findMany({
    where: { biometricId: { not: null } },
    orderBy: { biometricEnrolled: "desc" },
    select: { id: true, code: true, firstName: true, lastName: true, biometricId: true, biometricEnrolled: true },
    take: 500,
  });
  const total = await db.member.count();
  return {
    enrolled: members.map((m) => ({ ...m, name: fullName(m) })),
    totalMembers: total,
  };
}

// ── Events / scans ──────────────────────────────────────────────────────────

export async function listEvents(limit = 100) {
  const events = await db.biometricEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      device: { select: { name: true } },
      member: { select: { id: true, code: true, firstName: true, lastName: true } },
    },
  });
  return events.map((e) => ({
    id: e.id,
    device: e.device.name,
    biometricUserId: e.biometricUserId,
    member: e.member ? { id: e.member.id, code: e.member.code, name: fullName(e.member) } : null,
    result: e.result,
    reason: e.reason,
    scannedAt: e.scannedAt,
  }));
}

/** Find the device that is calling us, using its API key. */
export async function authenticateDevice(headers: Headers) {
  const auth = headers.get("authorization");
  const key = headers.get("x-device-key") ?? (auth?.startsWith("Bearer ") ? auth.slice(7) : null);
  if (!key) throw new ApiError(401, "Missing device key.");
  const device = await db.biometricDevice.findFirst({ where: { apiKeyHash: hashKey(key) } });
  if (!device) throw new ApiError(401, "Unknown device key.");
  if (!device.isActive) throw new ApiError(403, "This device is disabled in VOXI.");
  return device;
}

/** Handle one scan from a device: log it, and check the member in/out. */
export async function handleScan(opts: {
  device: { id: string; branchId: string | null };
  biometricUserId: string;
  scannedAt?: Date;
  direction?: "in" | "out" | "auto";
  raw?: unknown;
}) {
  const scannedAt = opts.scannedAt ?? new Date();
  await db.biometricDevice.update({ where: { id: opts.device.id }, data: { lastSeenAt: new Date() } });

  const member = await db.member.findUnique({ where: { biometricId: opts.biometricUserId } });
  if (!member) {
    await db.biometricEvent.create({
      data: {
        deviceId: opts.device.id,
        biometricUserId: opts.biometricUserId,
        result: "UNKNOWN_USER",
        reason: "No member enrolled with this ID",
        scannedAt,
        raw: (opts.raw ?? undefined) as never,
      },
    });
    return { allowed: false, action: "DENIED" as const, reason: "Unknown user", member: null };
  }

  const result = await recordAccess({
    memberId: member.id,
    branchId: opts.device.branchId,
    source: "BIOMETRIC",
    deviceId: opts.device.id,
    direction: opts.direction,
    at: scannedAt,
  });

  await db.biometricEvent.create({
    data: {
      deviceId: opts.device.id,
      biometricUserId: opts.biometricUserId,
      memberId: member.id,
      result: result.action === "IN" ? "GRANTED_IN" : result.action === "OUT" ? "GRANTED_OUT" : "DENIED",
      reason: result.reason,
      scannedAt,
      raw: (opts.raw ?? undefined) as never,
    },
  });

  return result;
}

// ── ZKTeco ADMS ("push") protocol ──────────────────────────────────────────

export async function findDeviceBySerial(sn: string | null) {
  if (!sn) throw new ApiError(400, "Missing SN");
  const device = await db.biometricDevice.findUnique({ where: { serialNumber: sn } });
  if (!device || !device.isActive) throw new ApiError(403, "Device not registered in VOXI");
  await db.biometricDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });
  return device;
}

/** ZKTeco sends lines like:  "1001\t2026-11-12 18:30:05\t0\t1\t0\t0" (PIN, local time, status, verify…) */
export async function handleAdmsAttlog(device: { id: string; branchId: string | null }, body: string) {
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let processed = 0;
  for (const line of lines) {
    const [pin, stamp, status] = line.split("\t");
    if (!pin || !stamp) continue;
    // Device clock is in Qatar local time (UTC+3)
    const scannedAt = new Date(stamp.replace(" ", "T") + "+03:00");
    // ZKTeco status "1" = check-out. Most gyms leave it on "0", so we treat
    // everything else as "auto": first scan of the day = in, next scan = out.
    const direction = status === "1" ? "out" : "auto";
    await handleScan({
      device,
      biometricUserId: pin,
      scannedAt: Number.isNaN(scannedAt.getTime()) ? new Date() : scannedAt,
      direction,
      raw: { line },
    });
    processed++;
  }
  return processed;
}
