"use client";

export default function AppRouteError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        MealBoard could not load this page. Try again, and check local Supabase
        if the problem continues.
      </p>
      <button
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </section>
  );
}
