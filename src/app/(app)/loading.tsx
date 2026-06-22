export default function AppRouteLoading() {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">Loading MealBoard</p>
      <div className="mt-4 grid gap-3">
        <div className="h-8 rounded-md bg-muted" />
        <div className="h-24 rounded-md bg-muted/70" />
        <div className="h-24 rounded-md bg-muted/70" />
      </div>
    </section>
  );
}
