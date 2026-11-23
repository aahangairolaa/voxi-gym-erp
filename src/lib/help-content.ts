/**
 * Content of the public Help Centre (/help): step-by-step guides and FAQs.
 * Plain data so it is easy to edit. Keep answers short and in plain English.
 */
import { CAFE_PRICE_YEAR, ENTRANCE_PRICE, MAX_CAFE_ITEMS, MAX_LOCATIONS, TRIAL_DAYS } from "@/lib/pricing";

export type Guide = { id: string; title: string; summary: string; steps: { title: string; body: string }[]; tips?: string[] };
export type FaqGroup = { id: string; title: string; items: [question: string, answer: string][] };

const qar = (n: number) => `QAR ${n.toLocaleString("en")}`;

export const GUIDES: Guide[] = [
  {
    id: "getting-started",
    title: "Getting started",
    summary: "From sign-up to your first member in about 15 minutes.",
    steps: [
      { title: "Create your account", body: `Go to voxiai.co and press Sign up. Enter your gym name, your first and last name, work email, mobile number and a password, or use Sign up with Google. We email you a 6-digit code to confirm the address. Your ${TRIAL_DAYS}-day free trial starts straight away, no card needed.` },
      { title: "Fill in your gym profile", body: "Open Settings and add your gym's phone, email, address, website and logo. These appear on invoices, receipts and member messages." },
      { title: "Add your branches", body: `If you run more than one location, add them under Settings, then Branches. You can run up to ${MAX_LOCATIONS} locations in total. Members, staff and check-ins can each belong to a branch.` },
      { title: "Create your membership plans", body: "Open Plans and add what you sell, for example Monthly, 3 Months, Annual or a 10-class pack. Set the price in QAR, the length, and any class or visit limits." },
      { title: "Invite your team", body: "Open Staff, press Add staff, choose their role and enter their email and a starting password. They sign in at voxiai.co with their own email. Each role only sees what it needs." },
      { title: "Add or import your members", body: "Open Members and press Add member, or use Import to bring in your existing members from an Excel or CSV file. Then give each member a membership from one of your plans." },
      { title: "Start checking people in", body: "Members can be checked in from the front desk, from the self check-in screen at /kiosk, by QR code, or by a biometric terminal at the entrance." },
    ],
    tips: ["The Get started checklist on your Dashboard shows what's left to set up.", "Everything you do in the trial is kept when you choose a plan."],
  },
  {
    id: "staff",
    title: "Staff, roles and sign-in",
    summary: "Who sees what, and how each person signs in.",
    steps: [
      { title: "Understand the roles", body: "Owner sees and controls everything. Manager runs the gym day to day. Reception handles members, check-ins and payments. Trainer sees their members, classes and workouts. Housekeeping staff are on the payroll but don't sign in." },
      { title: "Give everyone their own login", body: "Every person signs in at voxiai.co/login with their own email and password, and lands in their own view. Never share the owner login: each person's actions are recorded under their name." },
      { title: "First sign-in", body: "The first time someone signs in with a password, VOXI emails them a 6-digit code to confirm their email. After that it isn't asked again. Signing in with Google skips the code." },
      { title: "Control confidential information", body: "In Settings, under Roles and access, the owner chooses which roles can see revenue, payments, refunds, reports, expenses, member contact details, staff salaries and biometric settings." },
      { title: "Staff photos", body: "Open a staff member and upload a photo, so your team and members know who is who." },
      { title: "See who did what", body: "The Activity log (owner only) records every important action: payments, refunds, membership changes, settings and more, with the name and time." },
    ],
  },
  {
    id: "members",
    title: "Members and memberships",
    summary: "Add members, sell memberships, freeze, cancel and invoice.",
    steps: [
      { title: "Add a member", body: "Press Add member. First name, last name, mobile, gender and date of birth are required (members must be at least 10). Email, QID, nationality, emergency contact, photo and notes are optional." },
      { title: "Sell a membership", body: "On the member's page, press New membership, pick a plan and start date, and take the payment by cash, card, bank transfer or Fawran. The member becomes Active straight away." },
      { title: "Freeze or cancel", body: "From the member's page you can freeze a membership (for travel or injury) or cancel it. VOXI shows a warning first, because freezing moves the end date and cancelling stops access." },
      { title: "Invoices and receipts", body: "Each membership has Invoice and Take payment buttons. Invoices are printable and show your gym's details." },
      { title: "Import members", body: "Members, then Import. Download the template, fill it in and upload it. VOXI checks every row first and tells you which rows will be skipped and why (for example a phone number with letters in it)." },
      { title: "Find anyone fast", body: "Use the search bar at the top (Ctrl K) to find a member by name, member code or phone." },
    ],
  },
  {
    id: "attendance",
    title: "Check-in and attendance",
    summary: "Front desk, self check-in screen, QR codes and biometrics.",
    steps: [
      { title: "Check in at the front desk", body: "Open Attendance, search for the member and press Check in. VOXI warns you if their membership has expired, is frozen or has no visits left." },
      { title: "Set up the self check-in screen", body: "On a tablet or screen at reception, open voxiai.co/kiosk and set a PIN. Members check themselves in and out with their QR code, member code or full mobile number. The PIN stops anyone leaving the screen." },
      { title: "Show attendance on a big screen", body: "Attendance has a big-screen view for a TV at reception, showing who's in the gym right now." },
      { title: "Connect a biometric entrance", body: "Open Biometric and add your terminal. Face or fingerprint devices that support webhooks, and ZKTeco terminals in ADMS cloud mode, work out of the box. VOXI opens the turnstile only for members with an active membership." },
    ],
  },
  {
    id: "money",
    title: "Payments, cash and reports",
    summary: "Take payments, close the till, track expenses and see your numbers.",
    steps: [
      { title: "Take a payment", body: "Payments are recorded against a membership or as a one-off. Choose cash, card, bank transfer or Fawran. Every payment gets a receipt." },
      { title: "Refunds", body: "Only roles allowed to refund (set by the owner) can refund a payment. Refunds are recorded in the Activity log." },
      { title: "Open and close the cash drawer", body: "Cash Sessions: open the drawer with the starting float, and close it at the end of the shift. VOXI shows the expected cash so you can spot differences." },
      { title: "Record expenses", body: "Expenses: add rent, salaries, equipment and other costs so your reports show real profit." },
      { title: "Read your reports", body: "Reports show revenue, new members, renewals, attendance and expenses by day, month or branch." },
    ],
  },
  {
    id: "training",
    title: "Classes, workouts and engagement",
    summary: "Timetables, workout plans, leaderboards, leads and WhatsApp.",
    steps: [
      { title: "Build your class timetable", body: "Classes: add each class with its trainer, time, room and capacity. Members book a spot, and attendance is tracked." },
      { title: "Give members workout plans", body: "Workouts: trainers build plans from 160+ exercises with sets, reps and rest, and assign them to members." },
      { title: "Motivate with the leaderboard", body: "The Leaderboard ranks members by visits and activity, which is great on the reception screen." },
      { title: "Turn enquiries into members", body: "Leads: record walk-ins and calls, assign them to a staff member, and move them through New, Contacted, Trial and Converted." },
      { title: "Message members on WhatsApp", body: "WhatsApp: send renewal reminders, birthday wishes and announcements to members." },
    ],
  },
  {
    id: "cafe",
    title: "VOXI Café (add-on)",
    summary: "Run your in-house café: menu, counter sales, stock and team.",
    steps: [
      { title: "Preview it first", body: "Open Café in the sidebar. Until you add it to your plan, it shows a preview with sample data so you can see exactly how it works." },
      { title: "Unlock it", body: `Press Unlock VOXI Café (owner or manager), or switch on VOXI Café on the Billing page. It costs ${qar(CAFE_PRICE_YEAR)} a year, and shorter plans pay the same rate for their term.` },
      { title: "Build your menu", body: `Add up to ${MAX_CAFE_ITEMS} items with price, category, calories and protein. Switch on stock tracking for items like protein bars so the count goes down with every sale.` },
      { title: "Sell at the counter", body: "Tap items to build the order, link a member if you like, choose cash, card or transfer and press Charge. Today's takings and best sellers update straight away." },
      { title: "Set up your café team", body: "Press Café team and give staff a café job, such as Café manager or Barista." },
    ],
  },
  {
    id: "billing",
    title: "Your VOXI plan and billing",
    summary: "Choose a plan, add-ons, promo codes and what happens after the trial.",
    steps: [
      { title: "Choose your plan", body: "Open Billing. Pick 3 months, 6 months or Annual (best value). Every plan includes every feature." },
      { title: "Tailor it with add-ons", body: `Add branches (the 2nd added branch is 20% off and each one after costs less), biometric entrances (${qar(ENTRANCE_PRICE)} each, with a discount on every extra one), onboarding and data migration (free on Annual), and VOXI Café.` },
      { title: "Apply a promo code", body: "If you have a code, type it in the Promo code box in the summary and press Apply. The discount comes off your first invoice." },
      { title: "Send the request", body: "Press Choose this plan. The VOXI team confirms and sends your invoice within one business day. Pay by bank transfer, card or Fawran, and your plan is switched on." },
      { title: "When the trial ends", body: `After ${TRIAL_DAYS} days the app pauses until a plan is chosen. Your data is safe and nothing is deleted. Owners and managers can still open Billing and Settings.` },
    ],
  },
];

export const FAQS: FaqGroup[] = [
  {
    id: "faq-account",
    title: "Account and sign-in",
    items: [
      ["I didn't get the 6-digit code. What now?", "Check your spam or promotions folder, then press Resend after 30 seconds. Codes expire after 10 minutes. If it still doesn't arrive, email support@voxiai.co."],
      ["How do my staff sign in?", "Each person signs in at voxiai.co/login with the email and password you set for them on the Staff page. They only see what their role allows."],
      ["I forgot my password.", "On the sign-in page press Forgot password, enter your email, and follow the link we send you."],
      ["Can I sign in with Google?", "Yes. Use Continue with Google on the sign-in or sign-up page. Your Google email must match your VOXI email."],
      ["Can two people use the same login?", "Please don't. Give everyone their own login so the Activity log shows who did what, and so you can remove access when someone leaves."],
    ],
  },
  {
    id: "faq-members",
    title: "Members",
    items: [
      ["Why can't I save a member?", "VOXI checks every field. The field with a problem is outlined in red with a message under it, such as a phone number with the wrong number of digits or an email that isn't valid."],
      ["How many digits can a phone number have?", "Up to 15 digits after the country code. Each country has a minimum, for example 8 for Qatar and 10 for India. Pick the country code first, then type the number."],
      ["What's the minimum age for a member?", "Members must be at least 10 years old."],
      ["Can a member be in two branches?", "Each member has a home branch, which you choose on their profile. Reports and lists can be filtered by branch."],
      ["How do I bring in members from my old system?", "Use Members, then Import, with an Excel or CSV file, or choose Onboarding and data migration on the Billing page and we do it for you."],
    ],
  },
  {
    id: "faq-checkin",
    title: "Check-in and biometrics",
    items: [
      ["What does a member need to check in on the kiosk?", "Their QR code, their member code, or their full mobile number."],
      ["What happens if a membership has expired?", "The check-in is refused with a clear message, and the turnstile stays closed. Renew the membership and they can check in straight away."],
      ["Which biometric devices work?", "Any terminal that can call a web address (webhook), plus ZKTeco devices in ADMS cloud mode. Ask us before you buy hardware and we'll confirm it works."],
    ],
  },
  {
    id: "faq-billing",
    title: "Billing and plans",
    items: [
      ["Is there a free trial?", `Yes, ${TRIAL_DAYS} days with every feature. No card needed.`],
      ["What happens to my data if the trial ends?", "Nothing is deleted. The app pauses until you choose a plan, and everything is where you left it."],
      ["How do promo codes work?", "Enter the code on the Billing page before you request your plan. It comes off your first invoice. Some codes are only for the Annual plan."],
      ["How do I pay?", "By bank transfer, card or Fawran. We send the invoice within one business day of your request."],
      ["Can I add a branch or the café later?", "Yes. Open Billing at any time, change your add-ons and press Request this change."],
    ],
  },
  {
    id: "faq-data",
    title: "Data and security",
    items: [
      ["Is my data safe?", "Each gym's data is kept separate and encrypted in a cloud database. Staff only see what their role allows, and important actions are logged."],
      ["Who can see revenue and salaries?", "Only roles the owner allows, under Settings, then Roles and access."],
      ["Does VOXI work on phones and tablets?", "Yes. It works in any modern browser on a phone, tablet or computer. Nothing to install."],
      ["Is VOXI available in Arabic?", "The app is in English today. Arabic is on our roadmap."],
    ],
  },
];
