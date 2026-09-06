import { AdminPayoutReview } from "@/components/admin/admin-payout-review";

export default async function AdminPayoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminPayoutReview payoutId={id} />;
}
