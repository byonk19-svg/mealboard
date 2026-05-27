type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">
        Foundation placeholder
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-normal text-card-foreground">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
        {description}
      </p>
    </section>
  );
}
