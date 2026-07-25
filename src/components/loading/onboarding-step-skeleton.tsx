export function OnboardingStepSkeleton() {
  return (
    <div className="animate-pulse space-y-4 py-4">
      <div className="h-8 w-48 rounded-lg bg-muted" />
      <div className="h-4 w-full max-w-md rounded bg-muted" />
      <div className="mt-6 space-y-3">
        <div className="h-10 w-full rounded-lg bg-muted" />
        <div className="h-10 w-full rounded-lg bg-muted" />
        <div className="h-32 w-full rounded-xl bg-muted" />
      </div>
    </div>
  );
}
