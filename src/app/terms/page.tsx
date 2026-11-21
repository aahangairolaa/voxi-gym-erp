/*
 * Template terms of service. Have them reviewed by a Qatari lawyer and add your company's
 * legal name and CR number before relying on them.
 */
import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { CONTACT } from "@/lib/contact";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="22 November 2026">
      <p>These terms apply when a gym (“you”) uses VOXI, the gym management software provided by VOXI (“we”). By creating an account you agree to them.</p>

      <h2>Your account</h2>
      <ul>
        <li>You must give accurate details and keep your staff’s logins safe. You are responsible for what happens under your gym’s account.</li>
        <li>Give each staff member their own login with the right role, and remove access when someone leaves.</li>
      </ul>

      <h2>Free trial and subscription</h2>
      <ul>
        <li>New gyms get a 14-day free trial. To keep using VOXI after the trial, choose a paid plan.</li>
        <li>Subscriptions are billed in Qatari Riyal, monthly or yearly in advance, as shown on our pricing page or in your quote.</li>
        <li>If a payment is overdue we may pause the account after notice. Your data is not deleted while the account is paused.</li>
      </ul>

      <h2>Your data</h2>
      <ul>
        <li>Your gym’s data belongs to you. You can export it at any time.</li>
        <li>You confirm you have the right to store your members’ data in VOXI, and that you inform members as Qatari law requires.</li>
        <li>We handle personal data as described in our <a href="/privacy">privacy policy</a>.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Don’t use VOXI to break the law, send spam (including through WhatsApp), try to access other gyms’ data, or disrupt the service.</p>

      <h2>Third-party services</h2>
      <p>
        Features such as WhatsApp messaging, biometric devices and payment providers depend on third parties and their own terms. We aren’t responsible for their
        availability.
      </p>

      <h2>Service availability</h2>
      <p>
        We work to keep VOXI available and secure and back up data regularly, but the service is provided “as is”. To the extent the law allows, our total
        liability is limited to the fees you paid us in the 3 months before the claim.
      </p>

      <h2>Ending</h2>
      <p>You can stop using VOXI at any time. We may suspend accounts that break these terms. After you leave, you can export your data for 30 days.</p>

      <h2>Law</h2>
      <p>These terms are governed by the laws of the State of Qatar, and the courts of Qatar have jurisdiction.</p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
      </p>
    </LegalPage>
  );
}
