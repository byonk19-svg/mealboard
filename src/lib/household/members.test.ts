import { describe, expect, it } from "vitest";
import {
  evaluateHouseholdMemberRemoval,
  evaluateHouseholdMemberLink,
  evaluateHouseholdOwnerTransfer,
  normalizeHouseholdRole,
  normalizeHouseholdMemberEmail
} from "./members";

describe("household member helpers", () => {
  it("normalizes only supported household roles", () => {
    expect(normalizeHouseholdRole("owner")).toBe("owner");
    expect(normalizeHouseholdRole("member")).toBe("member");
    expect(normalizeHouseholdRole("admin")).toBeNull();
    expect(normalizeHouseholdRole(null)).toBeNull();
  });

  it("normalizes member emails for auth lookup", () => {
    expect(normalizeHouseholdMemberEmail(" Elaine@Example.COM ")).toBe(
      "elaine@example.com"
    );
  });

  it("rejects missing or malformed member emails", () => {
    expect(() => normalizeHouseholdMemberEmail("")).toThrow(
      "Member email is required."
    );
    expect(() => normalizeHouseholdMemberEmail("not-an-email")).toThrow(
      "Enter a valid member email."
    );
  });

  it("allows only owners to link household members", () => {
    expect(
      evaluateHouseholdMemberLink({
        actorRole: "member",
        existingMemberships: [],
        householdId: "household-1",
        targetUserId: "user-2"
      })
    ).toEqual({
      ok: false,
      reason: "Only household owners can link members."
    });
  });

  it("rejects a missing target auth user", () => {
    expect(
      evaluateHouseholdMemberLink({
        actorRole: "owner",
        existingMemberships: [],
        householdId: "household-1",
        targetUserId: null
      })
    ).toEqual({
      ok: false,
      reason: "That auth user does not exist yet."
    });
  });

  it("rejects duplicate membership in the same household", () => {
    expect(
      evaluateHouseholdMemberLink({
        actorRole: "owner",
        existingMemberships: [
          { householdId: "household-1", userId: "user-2" }
        ],
        householdId: "household-1",
        targetUserId: "user-2"
      })
    ).toEqual({
      ok: false,
      reason: "That user is already linked to this household."
    });
  });

  it("preserves the current one-household-per-login assumption", () => {
    expect(
      evaluateHouseholdMemberLink({
        actorRole: "owner",
        existingMemberships: [
          { householdId: "household-2", userId: "user-2" }
        ],
        householdId: "household-1",
        targetUserId: "user-2"
      })
    ).toEqual({
      ok: false,
      reason:
        "That user is already linked to another household. Add household switching before linking them here."
    });
  });

  it("accepts an existing auth user with no memberships", () => {
    expect(
      evaluateHouseholdMemberLink({
        actorRole: "owner",
        existingMemberships: [],
        householdId: "household-1",
        targetUserId: "user-2"
      })
    ).toEqual({
      ok: true,
      role: "member",
      userId: "user-2"
    });
  });

  it("allows owners to remove a non-owner member in their household", () => {
    expect(
      evaluateHouseholdMemberRemoval({
        actorRole: "owner",
        actorUserId: "owner-user",
        householdId: "household-1",
        memberships: [
          {
            householdId: "household-1",
            id: "membership-member",
            role: "member",
            userId: "member-user"
          }
        ],
        targetMembershipId: "membership-member"
      })
    ).toEqual({
      membershipId: "membership-member",
      ok: true,
      userId: "member-user"
    });
  });

  it("rejects member removal by non-owners", () => {
    expect(
      evaluateHouseholdMemberRemoval({
        actorRole: "member",
        actorUserId: "member-user",
        householdId: "household-1",
        memberships: [],
        targetMembershipId: "membership-member"
      })
    ).toEqual({
      ok: false,
      reason: "Only household owners can remove members."
    });
  });

  it("rejects removing yourself or another owner", () => {
    expect(
      evaluateHouseholdMemberRemoval({
        actorRole: "owner",
        actorUserId: "owner-user",
        householdId: "household-1",
        memberships: [
          {
            householdId: "household-1",
            id: "membership-owner",
            role: "owner",
            userId: "owner-user"
          }
        ],
        targetMembershipId: "membership-owner"
      })
    ).toEqual({
      ok: false,
      reason: "Owner transfer must be added before removing an owner."
    });

    expect(
      evaluateHouseholdMemberRemoval({
        actorRole: "owner",
        actorUserId: "owner-user",
        householdId: "household-1",
        memberships: [
          {
            householdId: "household-1",
            id: "membership-owner-2",
            role: "owner",
            userId: "other-owner"
          }
        ],
        targetMembershipId: "membership-owner-2"
      })
    ).toEqual({
      ok: false,
      reason: "Owner transfer must be added before removing an owner."
    });
  });

  it("rejects missing or out-of-household member removal targets", () => {
    expect(
      evaluateHouseholdMemberRemoval({
        actorRole: "owner",
        actorUserId: "owner-user",
        householdId: "household-1",
        memberships: [
          {
            householdId: "household-2",
            id: "membership-member",
            role: "member",
            userId: "member-user"
          }
        ],
        targetMembershipId: "membership-member"
      })
    ).toEqual({
      ok: false,
      reason: "That household member is no longer available."
    });
  });

  it("allows an owner to transfer ownership to a non-owner member", () => {
    expect(
      evaluateHouseholdOwnerTransfer({
        actorRole: "owner",
        actorUserId: "owner-user",
        householdId: "household-1",
        memberships: [
          {
            householdId: "household-1",
            id: "membership-owner",
            role: "owner",
            userId: "owner-user"
          },
          {
            householdId: "household-1",
            id: "membership-member",
            role: "member",
            userId: "member-user"
          }
        ],
        targetMembershipId: "membership-member"
      })
    ).toEqual({
      newOwnerMembershipId: "membership-member",
      newOwnerUserId: "member-user",
      ok: true,
      previousOwnerMembershipId: "membership-owner"
    });
  });

  it("rejects owner transfer by non-owners or to invalid targets", () => {
    const memberships = [
      {
        householdId: "household-1",
        id: "membership-owner",
        role: "owner",
        userId: "owner-user"
      },
      {
        householdId: "household-1",
        id: "membership-member",
        role: "member",
        userId: "member-user"
      }
    ];

    expect(
      evaluateHouseholdOwnerTransfer({
        actorRole: "member",
        actorUserId: "member-user",
        householdId: "household-1",
        memberships,
        targetMembershipId: "membership-owner"
      })
    ).toEqual({
      ok: false,
      reason: "Only household owners can transfer ownership."
    });

    expect(
      evaluateHouseholdOwnerTransfer({
        actorRole: "owner",
        actorUserId: "owner-user",
        householdId: "household-1",
        memberships,
        targetMembershipId: "membership-owner"
      })
    ).toEqual({
      ok: false,
      reason: "Choose a non-owner member to become owner."
    });

    expect(
      evaluateHouseholdOwnerTransfer({
        actorRole: "owner",
        actorUserId: "owner-user",
        householdId: "household-1",
        memberships,
        targetMembershipId: "missing"
      })
    ).toEqual({
      ok: false,
      reason: "That household member is no longer available."
    });
  });

  it("rejects ownership transfer when household ownership is ambiguous", () => {
    expect(
      evaluateHouseholdOwnerTransfer({
        actorRole: "owner",
        actorUserId: "owner-user",
        householdId: "household-1",
        memberships: [
          {
            householdId: "household-1",
            id: "membership-owner",
            role: "owner",
            userId: "owner-user"
          },
          {
            householdId: "household-1",
            id: "membership-other-owner",
            role: "owner",
            userId: "other-owner"
          },
          {
            householdId: "household-1",
            id: "membership-member",
            role: "member",
            userId: "member-user"
          }
        ],
        targetMembershipId: "membership-member"
      })
    ).toEqual({
      ok: false,
      reason: "Resolve household ownership before transferring ownership."
    });
  });
});
