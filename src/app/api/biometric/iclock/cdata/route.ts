/**
 * ZKTeco ADMS ("Push SDK") endpoint.
 * The device is configured with Server = your VOXI domain; it then calls:
 *   GET  /iclock/cdata?SN=XXXX&options=all   → handshake (we reply with settings)
 *   POST /iclock/cdata?SN=XXXX&table=ATTLOG  → attendance logs, one per line
 * (next.config.ts rewrites /iclock/* to this route.)
 */
import type { NextRequest } from "next/server";
import { findDeviceBySerial, handleAdmsAttlog } from "@/server/services/biometric.service";
import { ApiError } from "@/server/http";

const text = (body: string, status = 200) => new Response(body, { status, headers: { "Content-Type": "text/plain" } });

export async function GET(req: NextRequest) {
  try {
    const sn = req.nextUrl.searchParams.get("SN");
    await findDeviceBySerial(sn);
    return text(
      [
        `GET OPTION FROM: ${sn}`,
        "ATTLOGStamp=None",
        "OPERLOGStamp=9999",
        "ErrorDelay=30",
        "Delay=10",
        "TransTimes=00:00;14:05",
        "TransInterval=1",
        "TransFlag=1111000000",
        "TimeZone=3",
        "Realtime=1",
        "Encrypt=0",
      ].join("\n"),
    );
  } catch (e) {
    return text(e instanceof ApiError ? e.message : "ERROR", e instanceof ApiError ? e.status : 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sn = req.nextUrl.searchParams.get("SN");
    const table = req.nextUrl.searchParams.get("table");
    const device = await findDeviceBySerial(sn);
    const body = await req.text();
    if (table === "ATTLOG") {
      const n = await handleAdmsAttlog(device, body);
      return text(`OK: ${n}`);
    }
    // OPERLOG, USERINFO etc. are acknowledged but not stored in this MVP
    return text("OK");
  } catch (e) {
    return text(e instanceof ApiError ? e.message : "ERROR", e instanceof ApiError ? e.status : 500);
  }
}
