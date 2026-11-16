/**
 * Pretend to be a biometric turnstile — useful for testing without hardware.
 *
 *   npm run biometric:simulate -- 1001            (scan biometric user 1001)
 *   VOXI_URL=https://your-app.vercel.app DEVICE_KEY=vxk_... npm run biometric:simulate -- 1001
 *
 * Your real device (or a small "bridge" program on the gym PC) does exactly this
 * for every scan, then opens the turnstile when "allowed" is true.
 */
const url = process.env.VOXI_URL ?? "http://localhost:3000";
const key = process.env.DEVICE_KEY ?? "vxk_demo_the_pearl_entrance_000000000000000000";
const userId = process.argv[2] ?? "1001";

async function main() {
  const res = await fetch(`${url}/api/biometric/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-device-key": key },
    body: JSON.stringify({ biometricUserId: userId, scannedAt: new Date().toISOString() }),
  });
  const data = await res.json();
  console.log(`HTTP ${res.status}`);
  console.log(data);
  if (data.allowed) console.log(`\n✅ OPEN TURNSTILE — ${data.action === "IN" ? "Welcome" : "Goodbye"}, ${data.member?.name}`);
  else console.log(`\n⛔ ACCESS DENIED — ${data.reason ?? data.error}`);
}

main().catch((e) => {
  console.error("Could not reach VOXI:", e.message);
  process.exit(1);
});
