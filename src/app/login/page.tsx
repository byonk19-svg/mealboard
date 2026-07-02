import { redirect } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { signInWithPassword, signUpWithPassword } from "@/app/login/actions";
import { resolveLoginReturnPath } from "@/lib/auth/return-path";
import { createClient } from "@/lib/supabase/server";

const loginImageUrl =
  "/images/mealboard/login-kitchen-counter.png";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the private MealBoard family meal-planning app."
};

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
    <main className="mx-auto grid min-h-screen w-full max-w-[1200px] items-center gap-8 px-5 py-10 md:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] md:px-12">
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <span className="font-['Manrope'] text-xl font-bold text-primary">
            MealBoard
          </span>
          <span className="text-sm font-bold text-muted-foreground">
            Private beta
          </span>
        </div>

        <div>
          <p className="calm-eyebrow">Household planning</p>
          <h1 className="calm-heading mt-3 max-w-xl text-4xl leading-tight md:text-[48px]">
            Tailor your kitchen rhythm.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Plan meals, preserve household preferences, and shop from a grocery
            list that keeps source context visible.
          </p>
        </div>

        <div className="calm-card relative h-72 max-w-xl overflow-hidden">
          <Image
            alt="Fresh ingredients arranged on a bright kitchen counter."
            className="object-cover"
            fetchPriority="high"
            fill
            loading="eager"
            sizes="(min-width: 768px) 50vw, 100vw"
            src={loginImageUrl}
            unoptimized
          />
        </div>
      </section>

      <section className="calm-card w-full p-6 md:p-8">
        <div className="mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            MB
          </span>
          <h2 className="calm-heading mt-4 text-2xl">Sign in to MealBoard</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use your MealBoard Supabase auth user.
          </p>
        </div>

        {message ? (
          <p className="mb-4 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
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
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              id="password"
              minLength={6}
              name="password"
              required
              type="password"
            />
          </div>

          <div className={canCreateAccount ? "grid gap-2 sm:grid-cols-2" : ""}>
            <button
              className="min-h-11 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              formAction={signInWithPassword}
              type="submit"
            >
              Sign in
            </button>
            {canCreateAccount ? (
              <button
                className="min-h-11 rounded-lg border border-primary/30 bg-card px-5 py-3 text-sm font-bold text-primary hover:border-primary hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
