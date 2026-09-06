import Link from "next/link";
import { TERMS_EFFECTIVE_DATE, TERMS_VERSION } from "@/lib/legal";
import { LegalDocumentLayout, LegalSection } from "@/components/legal/legal-document-layout";

export const metadata = {
  title: "Vendor Agreement | Evendor",
  description: "Commercial terms between Evendor and independent event service providers.",
};

export default function VendorTermsPage() {
  return (
    <LegalDocumentLayout
      title="Vendor Agreement"
      version={TERMS_VERSION}
      effectiveDate={TERMS_EFFECTIVE_DATE}
    >
      <p>
        This Vendor Agreement is part of the commercial relationship between Evendor and vendors,
        venues and other independent service providers who list or fulfil bookings on the Platform.
        It should be read with the{" "}
        <Link href="/terms" className="font-medium text-primary hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-medium text-primary hover:underline">
          Privacy Policy
        </Link>
        . If you list a business on Evendor, you agree to this Agreement.
      </p>
      <p>
        You are an independent service provider, vendor or supplier engaged by Evendor to fulfil
        services booked through the Platform. Nothing in this Agreement makes you an employee of
        Evendor unless a separate written contract says so.
      </p>

      <LegalSection id="onboarding" title="1. Onboarding and accurate information">
        <p>
          You must provide accurate business, listing, pricing, availability, photos and payout
          information, and keep it up to date. You confirm you are authorised to offer the venue or
          services you list. Evendor may verify businesses, request documents, limit categories, or
          remove listings that appear misleading, unlawful or harmful.
        </p>
      </LegalSection>

      <LegalSection id="quality" title="2. Service quality, availability and delivery">
        <p>
          You must honour confirmed bookings, communicate professionally with customers, and deliver
          the service described in the booking. You are responsible for licences, taxes, insurance
          and the quality and safety of your own services. You must keep availability current and
          accept or decline booking requests according to the product tools provided.
        </p>
      </LegalSection>

      <LegalSection id="cancellation" title="3. Cancellation policy">
        <p>
          You configure the cancellation policy shown to customers at checkout. That policy is the
          source of truth for customer cancellation calculations on marketplace bookings. Do not
          publish a policy you cannot perform. Refunds, if any, follow that policy and Evendor&apos;s
          dispute and payout rules.
        </p>
      </LegalSection>

      <LegalSection id="completion" title="4. Completion, complaints and disputes">
        <p>
          After delivery, the customer may approve the job or report a problem. If the customer does
          not act, Evendor&apos;s existing 48-hour completion process may mark the booking complete
          where the rules are met and there is no unresolved problem report. A customer problem
          report can place payout on hold while Evendor reviews the issue. You must cooperate with
          complaints and disputes and must not try to bypass a hold.
        </p>
      </LegalSection>

      <LegalSection id="payouts" title="5. Payout eligibility and requests">
        <p>
          Customer payments are collected by Evendor through the configured payment processor.
          Vendor earnings shown in the dashboard are not necessarily immediately payable. You may
          request payout only when a booking is eligible under Evendor&apos;s payout rules
          (including successful payment, completion according to existing rules, and no unresolved
          dispute that blocks payout).
        </p>
        <p>
          A payout request is not payment. Evendor reviews requests and may approve, reject, delay
          or place them on hold for a legitimate financial, fraud, refund, dispute, incomplete
          service, invalid payout information or compliance reason. After approval, Evendor pays the
          applicable amount from its business payout account and records the payment. Approval is
          not itself proof that money has been transferred.
        </p>
        <p>
          Payable amounts are calculated from Evendor&apos;s authoritative booking and payment
          records. Evendor may deduct commission, fees, refunds, adjustments or other amounts
          permitted by the applicable agreement. You must provide accurate bank details and are
          responsible for those details being correct. Evendor does not guarantee a specific payout
          time.
        </p>
      </LegalSection>

      <LegalSection id="records" title="6. Records, fraud, suspension and termination">
        <p>
          Evendor may keep records of bookings, payments, cancellations, refunds, disputes and
          payouts. We may suspend or terminate access where we reasonably believe this Agreement,
          the Terms of Service, applicable law, fraud risk or customer safety has been breached.
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
