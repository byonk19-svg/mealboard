import { redirect } from "next/navigation";
import { signInWithPassword, signUpWithPassword } from "@/app/login/actions";
import { resolveLoginReturnPath } from "@/lib/auth/return-path";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
    returnTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { message, returnTo } = await searchParams;
  const resolvedReturnTo = resolveLoginReturnPath(returnTo);

  if (user) {
    redirect(resolvedReturnTo);
  }

  const canCreateAccount = process.env.MEALBOARD_ENABLE_PUBLIC_SIGNUP === "true";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <section className="w-full rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground">
            MB
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-normal">
            Sign in to MealBoard
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use a local Supabase auth user for this foundation slice.
          </p>
        </div>

        {message ? (
          <p className="mb-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}

        <form className="space-y-4">
          <input name="returnTo" type="hidden" value={resolvedReturnTo} />
          <div>
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              id="email"
              name="email"
              required
              type="email"
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              id="password"
              minLength={6}
              name="password"
              required
              type="password"
            />
          </div>

          <div className={canCreateAccount ? "grid gap-2 sm:grid-cols-2" : ""}>
            <button
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              formAction={signInWithPassword}
              type="submit"
            >
              Sign in
            </button>
            {canCreateAccount ? (
              <button
                className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                formAction={signUpWithPassword}
                type="submit"
              >
                Create account
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </main>
  );
}
