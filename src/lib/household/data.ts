import type { User } from "@supabase/supabase-js";
import {
  evaluateHouseholdMemberLink,
  normalizeHouseholdMemberEmail
} from "@/lib/household/members";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type HouseholdMemberForSettings = {
  createdAt: string;
  email: string | null;
  id: string;
  role: string;
  userId: string;
};

type AuthUserForLookup = Pick<User, "email" | "id">;

type HouseholdMembershipRow = {
  created_at: string;
  household_id: string;
  id: string;
  role: string;
  user_id: string;
};

export async function getHouseholdMemberSettings(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("household_memberships")
    .select("id, household_id, user_id, role, created_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as HouseholdMembershipRow[];
  const usersById = await getAuthUsersById().catch(() => getLocalAuthUsersById());

  return {
    adminLookupAvailable: usersById.size > 0,
    members: rows.map((row): HouseholdMemberForSettings => {
      const user = usersById.get(row.user_id);

      return {
        createdAt: row.created_at,
        email: user?.email ?? null,
        id: row.id,
        role: row.role,
        userId: row.user_id
      };
    })
  };
}

export async function linkExistingUserToHousehold({
  actorRole,
  email,
  householdId
}: {
  actorRole: string | null;
  email: string;
  householdId: string;
}) {
  const normalizedEmail = normalizeHouseholdMemberEmail(email);
  const admin = createAdminClient();
  const usersById = await getAuthUsersById().catch(() => getLocalAuthUsersById());
  const targetUser =
    Array.from(usersById.values()).find(
      (user) => user.email?.toLowerCase() === normalizedEmail
    ) ?? null;
  const { data, error } = await admin
    .from("household_memberships")
    .select("household_id, user_id");

  if (error) {
    throw new Error(error.message);
  }

  const decision = evaluateHouseholdMemberLink({
    actorRole,
    existingMemberships: ((data ?? []) as Array<{
      household_id: string;
      user_id: string;
    }>).map((membership) => ({
      householdId: membership.household_id,
      userId: membership.user_id
    })),
    householdId,
    targetUserId: targetUser?.id ?? null
  });

  if (!decision.ok) {
    throw new Error(decision.reason);
  }

  const { error: insertError } = await admin.from("household_memberships").insert({
    household_id: householdId,
    role: decision.role,
    user_id: decision.userId
  });

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function getAuthUsersById() {
  const admin = createAdminClient();
  const usersById = new Map<string, AuthUserForLookup>();
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000
    });

    if (error) {
      throw new Error(error.message);
    }

    for (const user of data.users) {
      usersById.set(user.id, user);
    }

    if (data.users.length < 1000) {
      return usersById;
    }

    page += 1;
  }
}

function getLocalAuthUsersById() {
  const usersById = new Map<string, AuthUserForLookup>();

  if (process.env.NODE_ENV === "production") {
    return usersById;
  }

  const rawLookup = process.env.MEALBOARD_LOCAL_AUTH_USER_LOOKUP;

  if (!rawLookup) {
    return usersById;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawLookup);
  } catch {
    return usersById;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return usersById;
  }

  for (const [email, userId] of Object.entries(parsed)) {
    if (typeof email !== "string" || typeof userId !== "string") {
      continue;
    }

    let normalizedEmail: string;

    try {
      normalizedEmail = normalizeHouseholdMemberEmail(email);
    } catch {
      continue;
    }

    if (!normalizedEmail || !userId) {
      continue;
    }

    usersById.set(userId, {
      email: normalizedEmail,
      id: userId
    });
  }

  return usersById;
}
