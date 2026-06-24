import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell/app-shell";
import { NoHouseholdState } from "@/components/shared/no-household-state";
import { resolveLoginReturnPath } from "@/lib/auth/return-path";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type ProtectedAppLayoutProps = {
  children: React.ReactNode;
};

export default async function ProtectedAppLayout({
  children
}: ProtectedAppLayoutProps) {
  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.user) {
    const headerStore = await headers();
    const returnTo = resolveLoginReturnPath(headerStore.get("x-mealboard-path"));
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <AppShell
      householdName={householdContext.household?.name}
      userEmail={householdContext.user.email}
    >
      {householdContext.household ? (
        children
      ) : (
        <NoHouseholdState errorMessage={householdContext.errorMessage} />
      )}
    </AppShell>
  );
}
