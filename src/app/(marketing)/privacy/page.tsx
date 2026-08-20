import Link from "next/link";
import {
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal";
import { LegalDocumentLayout, LegalSection } from "@/components/legal/legal-document-layout";

export const metadata = {
  title: "Privacy Policy | Evendor",
  description: "How Evendor collects, uses, and protects personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout
      title="Privacy Policy"
      version={PRIVACY_VERSION}
      effectiveDate={PRIVACY_EFFECTIVE_DATE}
    >
      <p>
        This Privacy Policy explains how Evendor collects and uses personal information when you use
        our website and related services. It should be read with our{" "}
        <Link href="/terms" className="font-medium text-primary hover:underline">
          Terms of Service
        </Link>{" "}
        (version {TERMS_VERSION}).
      </p>
      <p>
        We describe practices that the Platform actually performs today. If we introduce a new type
        of processing, we will update this Policy and, where required, ask you to accept the new
        version.
      </p>

      <LegalSection id="who" title="1. Who is responsible">
        <p>
          Evendor operates the marketplace at this website. For questions about personal data, email{" "}
          <a className="font-medium text-primary hover:underline" href="mailto:hello@evendor.ng">
            hello@evendor.ng
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="collect" title="2. Information we collect">
        <p>Depending on how you use Evendor, we may process:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Account and authentication:</strong> email address,
            password hashes held by our authentication provider (Supabase Auth), Google account
            identifiers if you use Google sign-in, and a unique user id.
          </li>
          <li>
            <strong className="text-foreground">Profile:</strong> name, phone number, city, avatar
            image, role (customer, vendor, or administrator), and onboarding answers such as event
            interests.
          </li>
          <li>
            <strong className="text-foreground">Vendor and venue information:</strong> business name,
            listing content, photos and videos, location, capacity, amenities, packages, bank account
            details you submit for payouts, and verification documents you upload.
          </li>
          <li>
            <strong className="text-foreground">Bookings and quotes:</strong> event date and times,
            guest count, notes, selected packages/add-ons, amounts, status, and related customer or
            walk-in client records a vendor stores in their tools.
          </li>
          <li>
            <strong className="text-foreground">Payments:</strong> booking amounts, payment and
            escrow status, Paystack references, payout and withdrawal records. We do not store full
            card numbers on Evendor.
          </li>
          <li>
            <strong className="text-foreground">Messages and reviews:</strong> in-app messages, media
            you attach in chat, ratings, review text, and vendor replies.
          </li>
          <li>
            <strong className="text-foreground">Rewards, notifications, and devices:</strong> rewards
            balances, in-app notifications, and push-subscription endpoints if you enable browser or
            device notifications.
          </li>
          <li>
            <strong className="text-foreground">Support and security:</strong> dispute files, audit
            logs of important account and admin actions, IP address and browser user agent when you
            accept the Terms and Privacy Policy, and similar security metadata from our hosts.
          </li>
          <li>
            <strong className="text-foreground">Vendor payout security:</strong> a withdrawal password
            you set (stored as a one-way hash) and optional device biometric/passkey credentials for
            withdrawals.
          </li>
          <li>
            <strong className="text-foreground">Newsletter:</strong> email address if you subscribe
            from the footer.
          </li>
          <li>
            <strong className="text-foreground">Usage we generate:</strong> listing view counts and
            similar first-party analytics events used to operate vendor dashboards and improve the
            marketplace. We also store limited local/session data for the installable app prompt and
            to avoid double-counting some views in a browser session.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="cookies" title="3. Cookies and similar storage">
        <p>
          We use cookies and similar storage that are required to keep you signed in (Supabase Auth
          session cookies), to complete password recovery, and to remember that you have accepted the
          current Terms and Privacy Policy versions. The browser may also store small flags for the
          progressive web app prompt. We do not currently run a third-party advertising pixel or a
          third-party analytics tag on the public site.
        </p>
      </LegalSection>

      <LegalSection id="use" title="4. How we use information">
        <p>We use personal information to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>create and secure accounts, including Google and email authentication;</li>
          <li>operate listings, search, bookings, messaging, reviews, and vendor dashboards;</li>
          <li>process payments, hold funds in escrow, pay vendors, and handle refunds/disputes;</li>
          <li>verify vendors, prevent fraud, and keep an audit trail of important actions;</li>
          <li>send transactional messages and, if you opted in, newsletter updates;</li>
          <li>record that you accepted a specific version of our Terms and Privacy Policy;</li>
          <li>comply with law and enforce our Terms.</li>
        </ul>
      </LegalSection>

      <LegalSection id="share" title="5. Who we share information with">
        <p>
          We share information with service providers who process it on our instructions to run
          Evendor:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase — authentication and database hosting;</li>
          <li>Paystack — payment collection and bank transfers;</li>
          <li>Cloudinary — image and video hosting for listings, avatars, and chat media;</li>
          <li>Google — if you choose Continue with Google;</li>
          <li>email delivery used by authentication (for example confirmation or magic links).</li>
        </ul>
        <p>
          Customers and vendors see information needed to fulfil a booking (for example names,
          booking details, and, where the product reveals it after confirmation, contact details).
          Administrators see account, booking, and trust-and-safety information as needed to operate
          the Platform.
        </p>
        <p>We do not sell your personal information.</p>
      </LegalSection>

      <LegalSection id="retention" title="6. Retention">
        <p>
          We keep account and booking records while your account is active and for a period afterwards
          as needed for disputes, accounting, security, and legal obligations. You may request
          deletion of your account in account settings. Deletion removes your profile and related
          application data we no longer need. We may retain limited records (including legal
          acceptance and payment/audit records) where the law or a dispute requires it.
        </p>
        <p>
          You can also request a copy of certain account data through the in-product export where
          available.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="7. Your rights">
        <p>
          Depending on applicable Nigerian data-protection law (including the Nigeria Data Protection
          Act / NDPR framework as it applies to you), you may request access, correction, or deletion
          of personal data we hold, or object to certain processing. Email{" "}
          <a className="font-medium text-primary hover:underline" href="mailto:hello@evendor.ng">
            hello@evendor.ng
          </a>
          . We may need to verify your identity before fulfilling a request.
        </p>
      </LegalSection>

      <LegalSection id="security" title="8. Security">
        <p>
          We use access controls, encrypted transport (HTTPS), hashed passwords via our auth
          provider, server-side recording of legal acceptance, and role-based admin permissions.
          No method of transmission or storage is completely secure. Use a strong unique password
          and protect your devices.
        </p>
      </LegalSection>

      <LegalSection id="children" title="9. Children">
        <p>
          Evendor is intended for adults arranging events and for businesses. We do not knowingly
          create accounts for children.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="10. Changes">
        <p>
          We may update this Policy. The version and effective date appear at the top of this page.
          If the required version changes, we will ask signed-in users to review and accept before
          continuing with account features.
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
