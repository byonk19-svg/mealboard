import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type Household = {
  id: string;
  name: string;
};

type HouseholdMembership = {
  id: string;
  household_id: string;
  user_id: string;
  role: string;
};

type HouseholdMembershipRow = HouseholdMembership & {
  households: Household | Household[] | null;
};

export type HouseholdContext = {
  user: User | null;
  household: Household | null;
  membership: HouseholdMembership | null;
  errorMessage?: string;
};

export async function getCurrentHouseholdContext(): Promise<HouseholdContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    return {
      user: null,
      household: null,
      membership: null,
      errorMessage: userError.message
    };
  }

  if (!user) {
    return {
      user: null,
      household: null,
      membership: null
    };
  }

  const { data, error } = await supabase
    .from("household_memberships")
    .select("id, household_id, user_id, role, households(id, name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      user,
      household: null,
      membership: null,
      errorMessage: error.message
    };
  }

  if (!data) {
    return {
      user,
      household: null,
      membership: null
    };
  }

  const row = data as HouseholdMembershipRow;
  const household = Array.isArray(row.households)
    ? row.households[0] ?? null
    : row.households;

  return {
    user,
    household,
    membership: {
      id: row.id,
      household_id: row.household_id,
      user_id: row.user_id,
      role: row.role
    }
  };
}
