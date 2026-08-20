import { LegalAcceptClient } from "@/components/auth/legal-accept-client";

export const metadata = {
  title: "Review Terms | Evendor",
};

export default function LegalAcceptPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <LegalAcceptClient />
    </div>
  );
}
