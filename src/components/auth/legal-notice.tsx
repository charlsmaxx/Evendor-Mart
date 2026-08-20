import Link from "next/link";

export function LegalNotice({
  googleLabel,
  emailLabel,
}: {
  googleLabel: string;
  emailLabel?: string;
}) {
  return (
    <p className="text-sm leading-relaxed text-foreground/80">
      By clicking &ldquo;{googleLabel}&rdquo;
      {emailLabel ? (
        <>
          {" "}
          or &ldquo;{emailLabel}&rdquo;
        </>
      ) : null}
      , you agree to Evendor&apos;s{" "}
      <Link
        href="/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Terms of Service
      </Link>{" "}
      and{" "}
      <Link
        href="/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
}
