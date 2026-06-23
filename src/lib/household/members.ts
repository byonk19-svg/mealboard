export type HouseholdMemberLinkMembership = {
  householdId: string;
  userId: string;
};

export type HouseholdMemberLinkDecision =
  | {
      ok: true;
      role: "member";
      userId: string;
    }
  | {
      ok: false;
      reason: string;
    };

export function normalizeHouseholdMemberEmail(value: FormDataEntryValue | null) {
  const email = String(value ?? "").trim().toLowerCase();

  if (!email) {
    throw new Error("Member email is required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid member email.");
  }

  return email;
}

export function evaluateHouseholdMemberLink({
  actorRole,
  existingMemberships,
  householdId,
  targetUserId
}: {
  actorRole: string | null;
  existingMemberships: HouseholdMemberLinkMembership[];
  householdId: string;
  targetUserId: string | null;
}): HouseholdMemberLinkDecision {
  if (actorRole !== "owner") {
    return {
      ok: false,
      reason: "Only household owners can link members."
    };
  }

  if (!targetUserId) {
    return {
      ok: false,
      reason: "That auth user does not exist yet."
    };
  }

  if (
    existingMemberships.some(
      (membership) =>
        membership.householdId === householdId &&
        membership.userId === targetUserId
    )
  ) {
    return {
      ok: false,
      reason: "That user is already linked to this household."
    };
  }

  if (existingMemberships.some((membership) => membership.userId === targetUserId)) {
    return {
      ok: false,
      reason:
        "That user is already linked to another household. Add household switching before linking them here."
    };
  }

  return {
    ok: true,
    role: "member",
    userId: targetUserId
  };
}
