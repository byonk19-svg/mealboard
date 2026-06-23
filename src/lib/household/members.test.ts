import { describe, expect, it } from "vitest";
import {
  evaluateHouseholdMemberLink,
  normalizeHouseholdMemberEmail
} from "./members";

describe("household member helpers", () => {
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
});
