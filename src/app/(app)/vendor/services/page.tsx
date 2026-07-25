"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Pause, Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { VendorPageHeader, VendorSkeleton } from "@/components/vendor/vendor-ui";

type Listing = {
  id: string;
  title: string;
  status: string;
  priceMin: number;
  images: string[];
};

export default function VendorServicesPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-profile"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/profile");
      const json = await res.json();
      return json.data as { listings: Listing[] };
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor-profile"] }),
  });

  if (isLoading) return <VendorSkeleton />;

  const listings = data?.listings ?? [];

  return (
    <div className="space-y-8">
      <VendorPageHeader
        title="Services"
        subtitle="Create, edit, pause, and manage your service listings."
        action={
          <Link href="/vendor/listings">
            <Button variant="gradient" size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Create Service
            </Button>
          </Link>
        }
      />

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No services yet.</p>
          <Link href="/vendor/listings" className="mt-4 inline-block">
            <Button variant="gradient">Create your first service</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {listings.map((l) => (
            <div
              key={l.id}
              className="overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-sm backdrop-blur-sm"
            >
              {l.images[0] && (
                <div
                  className="h-32 bg-cover bg-center"
                  style={{ backgroundImage: `url(${l.images[0]})` }}
                />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{l.title}</p>
                    <p className="text-sm text-primary">{formatCurrency(l.priceMin)}+</p>
                  </div>
                  <Badge variant={l.status === "PUBLISHED" ? "verified" : "secondary"}>
                    {l.status}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {l.status === "PUBLISHED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => toggleStatus.mutate({ id: l.id, status: "ARCHIVED" })}
                    >
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => toggleStatus.mutate({ id: l.id, status: "PUBLISHED" })}
                    >
                      <Play className="h-3.5 w-3.5" /> Activate
                    </Button>
                  )}
                  <Link href={`/vendor/listings/${l.id}/edit`}>
                    <Button size="sm" variant="ghost" className="gap-1">
                      <ExternalLink className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border/80 bg-muted/30 p-6">
        <p className="font-semibold">Packages</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create Basic, Premium, and Luxury packages from your profile settings. Package tiers help customers compare options quickly.
        </p>
        <Link href="/vendor/profile" className="mt-3 inline-block">
          <Button size="sm" variant="outline">Manage Packages in Profile</Button>
        </Link>
      </div>
    </div>
  );
}
