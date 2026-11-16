import { MEMBER_STATUS, type MemberStatus } from "@/lib/constants";
import { Badge, type Tone } from "./badge";

/** The coloured "Active / Expiring / Frozen / Expired" pill used everywhere. */
export function StatusBadge({ status }: { status: string }) {
  if (status === "CANCELLED") return <Badge tone="gray">Cancelled</Badge>;
  const s = MEMBER_STATUS[status as MemberStatus] ?? MEMBER_STATUS.NONE;
  return (
    <Badge tone={s.tone as Tone} dot>
      {s.label}
    </Badge>
  );
}

const PAY_TONE: Record<string, Tone> = { PAID: "green", PENDING: "amber", REFUNDED: "red" };
export function PaymentStatusBadge({ status }: { status: string }) {
  return <Badge tone={PAY_TONE[status] ?? "gray"}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}
