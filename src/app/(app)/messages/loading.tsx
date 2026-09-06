import { BrandLoader } from "@/components/loading/brand-loader";
import { MessagesSkeleton } from "@/components/loading/messages-skeleton";

export default function MessagesLoading() {
  return (
    <div>
      <div className="mb-6 flex justify-center">
        <BrandLoader size="md" />
      </div>
      <MessagesSkeleton />
    </div>
  );
}
