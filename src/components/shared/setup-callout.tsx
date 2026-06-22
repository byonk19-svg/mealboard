import Link from "next/link";

export type SetupCalloutTone = "info" | "warning";

export type SetupCalloutProps = {
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
  title: string;
  tone?: SetupCalloutTone;
};

export function SetupCallout({
  body,
  ctaHref,
  ctaLabel,
  title,
  tone = "info"
}: SetupCalloutProps) {
  const className =
    tone === "warning"
      ? "rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950"
      : "rounded-lg border border-border bg-muted/40 p-4 text-muted-foreground";

  return (
    <section className={className}>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6">{body}</p>
      {ctaHref && ctaLabel ? (
        <Link
          className="mt-3 inline-flex min-h-10 items-center rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          href={ctaHref}
        >
          {ctaLabel}
        </Link>
      ) : null}
    </section>
  );
}
