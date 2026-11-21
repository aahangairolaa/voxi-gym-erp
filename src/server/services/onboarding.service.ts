/** The "Get started" checklist new gyms see on their dashboard. */
import { db } from "../db";

export async function getOnboarding(gymId: string) {
  const [gym, staff, members, memberships, plansEdited, messages, devices, visits] = await Promise.all([
    db.gym.findUniqueOrThrow({ where: { id: gymId }, select: { logo: true, address: true, phone: true, whatsappEnabled: true, onboardingDismissedAt: true, createdAt: true } }),
    db.staff.count({ where: { gymId, isActive: true } }),
    db.member.count({ where: { gymId } }),
    db.membership.count({ where: { gymId } }),
    db.auditLog.count({ where: { gymId, action: { startsWith: "plan." } } }),
    db.whatsAppMessage.count({ where: { gymId } }),
    db.biometricDevice.count({ where: { gymId } }),
    db.attendance.count({ where: { gymId } }),
  ]);
  const steps = [
    { key: "profile", title: "Add your logo and gym details", hint: "Shown on invoices, member cards and messages", href: "/settings", done: !!gym.logo && !!(gym.address || gym.phone) },
    { key: "plans", title: "Check your membership plans & prices", hint: "We added starter plans in QAR — edit them to match yours", href: "/plans", done: plansEdited > 0 || memberships > 0 },
    { key: "team", title: "Add your team", hint: "Managers, reception, trainers and cleaners each get their own login", href: "/staff", done: staff > 1 },
    { key: "members", title: "Add or import your members", hint: "Upload your existing member list from Excel (CSV)", href: "/members?import=1", done: members > 0 },
    { key: "whatsapp", title: "Send your first WhatsApp", hint: "Renewal reminders and digital cards — works without any setup", href: "/members", done: gym.whatsappEnabled || messages > 0 },
    { key: "entrance", title: "Set up check-in", hint: "Scan member QR cards at reception, or connect a turnstile", href: "/attendance", done: devices > 0 || visits > 0 },
  ];
  const done = steps.filter((s) => s.done).length;
  return { steps, done, total: steps.length, dismissed: !!gym.onboardingDismissedAt };
}

export async function dismissOnboarding(gymId: string) {
  await db.gym.update({ where: { id: gymId }, data: { onboardingDismissedAt: new Date() } });
  return { ok: true };
}
