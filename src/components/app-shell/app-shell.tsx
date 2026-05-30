import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { AppNav } from "@/components/app-shell/app-nav";

type AppShellProps = {
  children: React.ReactNode;
  householdName?: string;
  userEmail?: string;
};

export function AppShell({
  children,
  householdName,
  userEmail
}: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground">
                MB
              </span>
              <span>
                <span className="block text-lg font-semibold leading-tight">
                  MealBoard
                </span>
                <span className="block text-sm leading-tight text-muted-foreground">
                  Family meals, planned calmly
                </span>
              </span>
            </Link>

            <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground sm:items-end">
              <div>
                {householdName ? (
                  <span className="font-medium text-foreground">
                    {householdName}
                  </span>
                ) : (
                  <span>No household linked</span>
                )}
                {userEmail ? <span> - {userEmail}</span> : null}
              </div>
              <form action={signOut}>
                <button
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>

          <AppNav />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
