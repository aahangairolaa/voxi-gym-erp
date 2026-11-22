/*
 * Template privacy policy written for Qatar (Law No. 13 of 2016 on Personal Data Privacy Protection).
 * Have it reviewed by a Qatari lawyer and fill in your company's legal name before relying on it.
 */
import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { CONTACT } from "@/lib/contact";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="22 November 2026">
      <p>
        VOXI (“we”, “us”) provides gym management software to gyms and fitness businesses in Qatar. This policy explains what personal data we handle, why, and the
        choices you have. It applies to our website and to the VOXI app.
      </p>

      <h2>Who is responsible for your data</h2>
      <p>
        <b>Gym members:</b> your gym decides what information it records about you in VOXI and is responsible for it (the “controller”). VOXI processes that
        data only on the gym’s instructions to provide the service. For questions about your membership data, please contact your gym first.
      </p>
      <p>
        <b>Gym owners and staff:</b> for your VOXI account and billing, VOXI is responsible for your data.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Account details of gym staff: name, email, phone, role, sign-in activity.</li>
        <li>Member records a gym enters: name, phone, email, date of birth, gender, QID, nationality, emergency contact, photo, notes.</li>
        <li>Activity: memberships, payments and invoices, check-ins (including from biometric devices), class bookings, workouts and messages sent.</li>
        <li>Technical data needed to run the service securely, such as sign-in cookies and error logs.</li>
      </ul>
      <p>Biometric devices store fingerprints or face templates on the device itself; VOXI receives only a member number and the time of each scan.</p>

      <h2>Why we use it</h2>
      <ul>
        <li>To provide the service the gym has asked for (running memberships, payments, access control and communication).</li>
        <li>To keep accounts secure, prevent misuse and fix problems.</li>
        <li>To bill gyms for their VOXI subscription and to contact them about the service.</li>
        <li>To meet legal obligations.</li>
      </ul>
      <p>We do not sell personal data and we do not use member data for advertising.</p>

      <h2>Sharing</h2>
      <p>
        We use trusted providers to run VOXI, such as cloud hosting and database providers, email delivery and, when a gym connects it, the WhatsApp Business
        Platform by Meta. They may only use the data to provide their service to us. We share data with authorities only when the law requires it.
      </p>

      <h2>Where data is stored and how it is protected</h2>
      <p>
        Data is stored with our cloud providers and may be processed outside Qatar where they operate. We protect it with encryption in transit (HTTPS), hashed
        passwords, encrypted integration keys, role-based access inside each gym and strict separation between gyms.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Gym data is kept while the gym uses VOXI. When a gym leaves, it can export its data, and we delete it within 90 days unless the law requires us to keep
        it longer (for example, financial records).
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to access, correct or delete your personal data, or object to how it is used. Members should contact their gym; gyms and staff can contact
        us at <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>. We will reply within 30 days.
      </p>

      <h2>Changes</h2>
      <p>If we make important changes to this policy we will tell gyms by email or in the app.</p>

      <h2>Contact</h2>
      <p>
        VOXI · Doha, Qatar · <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
      </p>
    </LegalPage>
  );
}
