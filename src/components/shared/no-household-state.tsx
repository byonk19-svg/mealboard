type NoHouseholdStateProps = {
  errorMessage?: string;
};

export function NoHouseholdState({ errorMessage }: NoHouseholdStateProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">
        Household setup needed
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-normal text-card-foreground">
        This user is not linked to a MealBoard household yet.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
        Ask a household owner to open Settings, then Household, and link this
        existing auth user by email. Local development can still use the README
        setup notes for the first owner account.
      </p>
      {errorMessage ? (
        <p className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
