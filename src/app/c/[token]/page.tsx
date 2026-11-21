/**
 * Public digital member card:  https://<your-domain>/c/<token>
 * Members open this link on their phone (sent by WhatsApp) and show the QR
 * at reception. No login needed — the token is long and random.
 */
import type { Metadata } from "next";
import { headers } from "next/headers";
import { MemberCardVisual } from "@/components/members/member-card-visual";
import { getCard } from "@/server/services/card.service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

async function load(token: string) {
  try {
    return await getCard(token);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const card = await load((await params).token);
  return {
    title: card ? `${card.firstName}'s card · ${card.gym.name}` : "Member card",
    robots: { index: false, follow: false },
  };
}

export default async function MemberCardPage({ params }: Props) {
  const { token } = await params;
  const card = await load(token);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;

  if (!card) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#0d0a1f] p-6 text-center text-white">
        <div>
          <p className="text-lg font-semibold">This card link isn’t valid any more</p>
          <p className="mt-2 text-sm text-white/60">Ask reception to send you a new one.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[radial-gradient(80%_60%_at_50%_0%,#2a1d6b,#0d0a1f_70%)] p-5">
      <MemberCardVisual
        gym={card.gym}
        name={card.name}
        code={card.code}
        photoUrl={card.photoUrl}
        // The QR holds this page's own link; the attendance scanner understands it.
        qrValue={`${origin}/c/${card.token}`}
        membership={card.membership ? { ...card.membership, endDate: card.membership.endDate.toISOString() } : null}
      />
      <div className="max-w-[360px] text-center text-xs text-white/55">
        <p>Tip: add this page to your home screen to open your card in one tap.</p>
        {card.gym.phone && (
          <p className="mt-1">
            Questions? Call {card.gym.name} on <a className="underline" href={`tel:${card.gym.phone.replace(/\s/g, "")}`}>{card.gym.phone}</a>
          </p>
        )}
      </div>
    </main>
  );
}
