import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { NoHouseholdState } from "@/components/shared/no-household-state";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type ProtectedAppLayoutProps = {
  children: React.ReactNode;
};

export default async function ProtectedAppLayout({
  children
}: ProtectedAppLayoutProps) {
  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.user) {
    redirect("/login");
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
