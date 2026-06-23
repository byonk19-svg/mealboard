import type { User } from "@supabase/supabase-js";
import {
  evaluateHouseholdMemberRemoval,
  evaluateHouseholdMemberLink,
  evaluateHouseholdOwnerTransfer,
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

export async function removeHouseholdMember({
  actorRole,
  actorUserId,
  householdId,
  membershipId
}: {
  actorRole: string | null;
  actorUserId: string;
  householdId: string;
  membershipId: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("household_memberships")
    .select("id, household_id, user_id, role")
    .eq("household_id", householdId);

  if (error) {
    throw new Error(error.message);
  }

  const decision = evaluateHouseholdMemberRemoval({
    actorRole,
    actorUserId,
    householdId,
    memberships: ((data ?? []) as Array<{
      household_id: string;
      id: string;
      role: string;
      user_id: string;
    }>).map((membership) => ({
      householdId: membership.household_id,
      id: membership.id,
      role: membership.role,
      userId: membership.user_id
    })),
    targetMembershipId: membershipId
  });

  if (!decision.ok) {
    throw new Error(decision.reason);
  }

  const { error: deleteError } = await admin
    .from("household_memberships")
    .delete()
    .eq("household_id", householdId)
    .eq("id", decision.membershipId)
    .eq("user_id", decision.userId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }
}

export async function transferHouseholdOwnership({
  actorRole,
  actorUserId,
  householdId,
  membershipId
}: {
  actorRole: string | null;
  actorUserId: string;
  householdId: string;
  membershipId: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("household_memberships")
    .select("id, household_id, user_id, role")
    .eq("household_id", householdId);

  if (error) {
    throw new Error(error.message);
  }

  const memberships = ((data ?? []) as Array<{
    household_id: string;
    id: string;
    role: string;
    user_id: string;
  }>).map((membership) => ({
    householdId: membership.household_id,
    id: membership.id,
    role: membership.role,
    userId: membership.user_id
  }));
  const decision = evaluateHouseholdOwnerTransfer({
    actorRole,
    actorUserId,
    householdId,
    memberships,
    targetMembershipId: membershipId
  });

  if (!decision.ok) {
    throw new Error(decision.reason);
  }

  const { error: promoteError } = await admin
    .from("household_memberships")
    .update({ role: "owner" })
    .eq("household_id", householdId)
    .eq("id", decision.newOwnerMembershipId)
    .eq("user_id", decision.newOwnerUserId);

  if (promoteError) {
    throw new Error(promoteError.message);
  }

  const { error: demoteError } = await admin
    .from("household_memberships")
    .update({ role: "member" })
    .eq("household_id", householdId)
    .eq("id", decision.previousOwnerMembershipId)
    .eq("user_id", actorUserId);

  if (demoteError) {
    await admin
      .from("household_memberships")
      .update({ role: "member" })
      .eq("household_id", householdId)
      .eq("id", decision.newOwnerMembershipId)
      .eq("user_id", decision.newOwnerUserId);

    throw new Error(demoteError.message);
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
