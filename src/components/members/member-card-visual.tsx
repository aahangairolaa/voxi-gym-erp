import { Avatar, QrCode } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { MEMBER_STATUS, type MemberStatus } from "@/lib/constants";

/**
 * The digital membership card: gym branding, photo, name, plan and a QR code
 * that reception scans to check the member in. Used on the member profile and
 * on the public card page (/c/<token>) members save on their phone.
 */
export function MemberCardVisual({
  gym,
  name,
  code,
  photoUrl,
  qrValue,
  membership,
}: {
  gym: { name: string; logo: string | null; brandColor: string | null };
  name: string;
  code: string;
  photoUrl: string | null;
  qrValue: string;
  membership: { plan: string; endDate: string; status: MemberStatus } | null;
}) {
  const color = gym.brandColor ?? "#6a44f2";
  const ok = membership && (membership.status === "ACTIVE" || membership.status === "EXPIRING");
  return (
    <div
      className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-[28px] p-6 text-white shadow-[0_30px_60px_-20px_rgba(40,20,120,0.55)]"
      style={{ background: `radial-gradient(120% 90% at 100% 0%, ${color}cc, transparent 60%), linear-gradient(160deg, #1c1442, #0d0a1f)` }}
    >
      <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full opacity-40 blur-2xl" style={{ background: color }} />
      <div className="relative flex items-center gap-3">
        {gym.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gym.logo} alt="" className="h-10 w-10 rounded-xl bg-white object-contain p-1" />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-lg font-bold">{gym.name.slice(0, 1)}</span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{gym.name}</p>
          <p className="text-[10px] font-semibold tracking-[0.25em] text-white/60 uppercase">Member card</p>
        </div>
      </div>

      <div className="relative mt-6 flex items-center gap-4">
        <Avatar name={name} src={photoUrl} size={64} className="ring-2 ring-white/30" />
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold">{name}</p>
          <p className="font-mono text-xs text-white/70">{code}</p>
        </div>
      </div>

      <div className="relative mt-6 grid place-items-center">
        <QrCode value={qrValue} size={188} className="shadow-lg" />
        <p className="mt-2 text-[11px] text-white/60">Show this code at reception to check in</p>
      </div>

      <div className="relative mt-5 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm backdrop-blur">
        <div className="min-w-0">
          <p className="text-[10px] tracking-wider text-white/60 uppercase">Plan</p>
          <p className="truncate font-semibold">{membership?.plan ?? "No active plan"}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] tracking-wider text-white/60 uppercase">{membership ? "Valid until" : "Status"}</p>
          <p className={`font-semibold ${ok ? "text-emerald-300" : "text-amber-300"}`}>
            {membership ? (ok ? formatDate(membership.endDate) : MEMBER_STATUS[membership.status].label) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
