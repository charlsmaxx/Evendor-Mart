import Link from "next/link";
import {
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_VERSION,
  TERMS_EFFECTIVE_DATE,
  TERMS_VERSION,
} from "@/lib/legal";
import { LegalDocumentLayout, LegalSection } from "@/components/legal/legal-document-layout";

export const metadata = {
  title: "Terms of Service | Evendor",
  description: "The terms that govern your use of the Evendor event marketplace.",
};

export default function TermsPage() {
  return (
    <LegalDocumentLayout
      title="Terms of Service"
      version={TERMS_VERSION}
      effectiveDate={TERMS_EFFECTIVE_DATE}
    >
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern access to and use of Evendor, including
        the website, applications, and related services (the &ldquo;Platform&rdquo;). By creating an
        account, clicking &ldquo;Continue with Google&rdquo; or &ldquo;Continue with Email&rdquo;, or
        otherwise using Evendor, you agree to these Terms and to our{" "}
        <Link href="/privacy" className="font-medium text-primary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
      <p>
        If you do not agree, do not create an account or use the Platform. If we publish a new
        required version of these Terms, we will ask you to review and accept it before continuing
        to use account features.
      </p>

      <LegalSection id="who-we-are" title="1. Who we are">
        <p>
          Evendor is an online marketplace that helps customers discover, compare, and book event
          halls and event service vendors in Nigeria. Evendor is a platform operator. Except where
          these Terms say otherwise, Evendor is not the venue owner, caterer, photographer, or other
          supplier of the underlying event service.
        </p>
        <p>
          You can contact us at{" "}
          <a className="font-medium text-primary hover:underline" href="mailto:hello@evendor.ng">
            hello@evendor.ng
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="2. Accounts and eligibility">
        <p>
          You must provide accurate registration information and keep your login details secure. You
          are responsible for activity that occurs under your account. Notify us promptly if you
          believe your account has been misused.
        </p>
        <p>
          You may register with email and password, Google sign-in, or another method we make
          available. Accounts may be used by customers, vendors/venue operators, and authorised
          Evendor administrators.
        </p>
        <p>
          We may suspend or close an account where we reasonably believe these Terms, applicable law,
          or the safety of other users have been breached.
        </p>
      </LegalSection>

      <LegalSection id="marketplace" title="3. The marketplace">
        <p>
          Listings, prices, availability, photos, packages, and vendor terms are supplied by vendors
          and venues. Evendor does not guarantee that a listing is accurate, available on a given
          date, or suitable for your event. You should review the listing, cancellation policy, and
          any vendor terms before paying.
        </p>
        <p>
          A booking on Evendor creates a contract between the customer and the vendor for the
          listed service or venue, on the booking details shown at checkout (including date, package,
          add-ons, price, and the applicable cancellation policy). Evendor provides the booking
          tools, messaging, and payment holding described in these Terms.
        </p>
      </LegalSection>

      <LegalSection id="bookings-payments" title="4. Bookings, fees, and payments">
        <p>
          Bookings are paid in full at the time of booking unless we clearly state otherwise for a
          specific product. Payments are processed by Paystack. Card and bank details entered on
          Paystack&apos;s checkout are handled by Paystack, not stored as full card numbers on
          Evendor.
        </p>
        <p>
          Amounts paid for a booking are held by Evendor (Evendor Escrow) until the customer
          confirms the job is done, a vendor completion flow is confirmed under our processes, a
          dispute is resolved, or another release/refund rule in these Terms or the listing
          cancellation policy applies. Evendor may deduct its platform fees before paying a vendor.
        </p>
        <p>
          Checkout shows the booking total, any rewards applied, the amount to pay, and the
          cancellation/refund terms for that booking. You must accept those transaction terms before
          paying.
        </p>
        <p>
          Vendors receive payouts to a verified bank account they provide, subject to eligibility,
          identity/security checks, and Paystack transfer rules. Evendor is not a bank.
        </p>
      </LegalSection>

      <LegalSection id="cancellations" title="5. Cancellations, refunds, and disputes">
        <p>
          Each listing or package may have its own cancellation windows and refund percentages.
          Those terms are displayed before payment and form part of the booking. Refunds, if any,
          follow that policy and our escrow/dispute processes. Platform fees and non-refundable
          amounts described at checkout may not be returned.
        </p>
        <p>
          Customers and vendors may raise a dispute through Evendor where the service was not
          provided as booked. We may request evidence, pause a payout, refund a customer, pay a
          vendor, or split funds as we reasonably decide based on the information available. Our
          decision on escrow release in a dispute is final as between the parties and Evendor,
          without limiting any non-waivable legal rights.
        </p>
      </LegalSection>

      <LegalSection id="customers" title="6. Customer responsibilities">
        <p>
          Provide accurate event details, treat vendors professionally, and use messaging and reviews
          in good faith. Do not use Evendor to harass, defraud, or circumvent payments for bookings
          that originated on the Platform in a way that violates these Terms.
        </p>
        <p>
          Reviews must reflect a genuine booking experience. We may remove reviews that are abusive,
          fake, or unlawful.
        </p>
      </LegalSection>

      <LegalSection id="vendors" title="7. Vendor and venue terms">
        <p>
          If you list a business on Evendor, you also agree to this section. You confirm that you
          are authorised to offer the venue or services you list, that your information (including
          prices, availability, photos, and bank details) is accurate, and that you will honour
          confirmed bookings.
        </p>
        <p>
          You must set cancellation and service terms that you can actually perform. You are
          responsible for licenses, taxes, insurance, and the quality and safety of your own
          services. Evendor may verify businesses, feature listings, limit categories, or remove
          listings that appear misleading, unlawful, or harmful to customers.
        </p>
        <p>
          Payouts depend on completed eligible bookings, absence of open disputes where funds are
          held, and successful bank transfer. You must keep withdrawal credentials secure. You must
          not attempt to bypass escrow for marketplace bookings.
        </p>
        <p>
          Optional vendor tools (for example analytics, manual/offline booking records, staff access,
          or subscription features) are provided as described in the product at the time you use
          them.
        </p>
      </LegalSection>

      <LegalSection id="content" title="8. Content, messaging, and media">
        <p>
          You retain rights in content you upload (photos, videos, messages, listing copy). You grant
          Evendor a non-exclusive licence to host, display, and process that content as needed to
          operate the marketplace, including showing listings to customers.
        </p>
        <p>
          Do not upload content you do not have the right to use, or that is illegal, infringing, or
          harmful. We may remove content and media stored with our providers (including Cloudinary)
          where reasonably necessary.
        </p>
      </LegalSection>

      <LegalSection id="rewards" title="9. Rewards">
        <p>
          Evendor Rewards, where offered, are a promotional balance you may earn or redeem according
          to the rules shown in the product. Rewards are not cash, have no value outside Evendor, and
          may be adjusted or withdrawn if we reasonably believe they were obtained in error or
          through abuse.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="10. Acceptable use">
        <p>
          You must not: probe or disrupt the Platform; scrape data except via documented features we
          provide to you; impersonate others; submit malware; attempt to access another user&apos;s
          account, payouts, or messages; or use Evendor for unlawful events or payments.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="11. Disclaimers and liability">
        <p>
          The Platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.
          Event services are performed by independent vendors. Evendor is not liable for vendor
          no-shows, quality of an event, venue conditions, or losses arising from your event except
          to the extent caused by Evendor&apos;s own wilful misconduct or as required by law.
        </p>
        <p>
          To the maximum extent permitted by Nigerian law, Evendor&apos;s total liability arising
          out of these Terms or a booking facilitated on the Platform is limited to the greater of
          (a) the platform fees Evendor retained on the relevant booking or (b) ten thousand Naira
          (₦10,000). This does not exclude liability that cannot legally be excluded, including for
          fraud.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="12. Changes">
        <p>
          We may update these Terms. The version and effective date appear at the top of this page.
          If a change is material, we will require you to accept the new version before using
          signed-in features. Continued use after you accept (or, where permitted, after notice of
          non-material updates) constitutes agreement to the updated Terms.
        </p>
      </LegalSection>

      <LegalSection id="law" title="13. Governing law">
        <p>
          These Terms are governed by the laws of the Federal Republic of Nigeria. Courts of
          competent jurisdiction in Nigeria shall have exclusive jurisdiction, except where
          applicable law gives you a non-waivable right to another forum.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="14. Contact">
        <p>
          Evendor ·{" "}
          <a className="font-medium text-primary hover:underline" href="mailto:hello@evendor.ng">
            hello@evendor.ng
          </a>
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
