import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ArrowRight } from "lucide-react";

export function BecomeVendorCard({ isLoggedIn }: { isLoggedIn: boolean }) {
  const setupHref = isLoggedIn
    ? "/list-your-business"
    : "/register?role=vendor&redirect=/list-your-business";

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="overflow-hidden border-primary/20">
        <CardContent className="p-8 text-center sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold">List on Evendor</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Choose between listing an event center or a service business — each has its own setup and
            appears in the right search results for customers.
          </p>
          <Button variant="gradient" size="lg" className="mt-8" asChild>
            <Link href={setupHref}>
              Click here to set up your business account <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          {!isLoggedIn && (
            <p className="mt-4 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login?redirect=/list-your-business" className="text-primary hover:underline">
                Sign in first
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
