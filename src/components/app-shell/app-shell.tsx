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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-4 md:px-10 lg:px-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link
              href="/dashboard"
              className="group flex min-h-12 w-fit items-center gap-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-extrabold text-primary-foreground shadow-[0_12px_28px_rgba(2,27,13,0.18)]">
                MB
              </span>
              <span>
                <span className="block text-xl font-extrabold leading-tight text-primary">
                  MealBoard
                </span>
                <span className="block text-sm leading-tight text-muted-foreground">
                  Family meals, planned calmly
                </span>
              </span>
            </Link>

            <div className="flex flex-col items-start gap-3 md:items-end">
              <div className="text-sm text-muted-foreground">
                {householdName ? (
                  <span className="font-semibold text-primary">
                    {householdName}
                  </span>
                ) : (
                  <span>No household linked</span>
                )}
                {userEmail ? (
                  <span className="hidden sm:inline"> - {userEmail}</span>
                ) : null}
              </div>
              <form action={signOut}>
                <button
                  className="calm-button-secondary px-4 py-2 hover:border-primary hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 md:px-10 md:py-10 lg:px-12">
        {children}
      </main>

      <footer className="border-t border-border/70 bg-card/70">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-10 lg:px-12">
          <span className="font-semibold text-primary">MealBoard</span>
          <span>Private family meal plans, recipe memory, and grocery lists.</span>
          <nav className="flex flex-wrap gap-2" aria-label="Footer navigation">
            <Link
              className="inline-flex min-h-11 items-center px-2"
              href="/settings/profiles"
            >
              Profiles
            </Link>
            <Link
              className="inline-flex min-h-11 items-center px-2"
              href="/settings/baby"
            >
              Baby setup
            </Link>
            <Link
              className="inline-flex min-h-11 items-center px-2"
              href="/settings/staples"
            >
              Staples
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
