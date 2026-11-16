import type { NextRequest } from "next/server";
import { findDeviceBySerial } from "@/server/services/biometric.service";

/** ZKTeco polls this for pending commands. We have none → "OK". */
export async function GET(req: NextRequest) {
  try {
    await findDeviceBySerial(req.nextUrl.searchParams.get("SN"));
    return new Response("OK", { headers: { "Content-Type": "text/plain" } });
  } catch {
    return new Response("ERROR", { status: 403 });
  }
}
