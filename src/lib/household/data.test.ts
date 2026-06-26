import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeHouseholdMember, transferHouseholdOwnership } from "./data";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn()
}));

vi.mock("@/lib/household/members", async () => import("./members"));

type MembershipRow = {
  household_id: string;
  id: string;
  role: string;
  user_id: string;
};

type Operation = {
  filters: Array<[string, unknown]>;
  options: unknown;
  payload: unknown;
  type: "delete" | "select" | "update";
};

describe("household member data writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects member removal when the delete matches no rows", async () => {
    const { admin } = createFakeAdminClient({
      rows: [
        {
          household_id: "household-1",
          id: "membership-member",
          role: "member",
          user_id: "member-user"
        }
      ],
      writeCounts: [0]
    });
    (createAdminClient as Mock).mockReturnValue(admin);

    await expect(
      removeHouseholdMember({
        actorRole: "owner",
        actorUserId: "owner-user",
        householdId: "household-1",
        membershipId: "membership-member"
      })
    ).rejects.toThrow("That household member is no longer available.");
  });

  it("rejects owner transfer when the promotion matches no rows", async () => {
    const { admin } = createFakeAdminClient({
      rows: [
        {
          household_id: "household-1",
          id: "membership-owner",
          role: "owner",
          user_id: "owner-user"
        },
        {
          household_id: "household-1",
          id: "membership-member",
          role: "member",
          user_id: "member-user"
        }
      ],
      writeCounts: [0]
    });
    (createAdminClient as Mock).mockReturnValue(admin);

    await expect(
      transferHouseholdOwnership({
        actorRole: "owner",
        actorUserId: "owner-user",
        householdId: "household-1",
        membershipId: "membership-member"
      })
    ).rejects.toThrow("That household member is no longer available.");
  });

  it("rejects owner transfer and rolls back when demotion matches no rows", async () => {
    const { admin, operations } = createFakeAdminClient({
      rows: [
        {
          household_id: "household-1",
          id: "membership-owner",
          role: "owner",
          user_id: "owner-user"
        },
        {
          household_id: "household-1",
          id: "membership-member",
          role: "member",
          user_id: "member-user"
        }
      ],
      writeCounts: [1, 0, 1]
    });
    (createAdminClient as Mock).mockReturnValue(admin);

    await expect(
      transferHouseholdOwnership({
        actorRole: "owner",
        actorUserId: "owner-user",
        householdId: "household-1",
        membershipId: "membership-member"
      })
    ).rejects.toThrow("Resolve household ownership before transferring ownership.");

    expect(operations.filter((operation) => operation.type === "update")).toEqual([
      expect.objectContaining({
        options: { count: "exact" },
        payload: { role: "owner" }
      }),
      expect.objectContaining({
        options: { count: "exact" },
        payload: { role: "member" }
      }),
      expect.objectContaining({
        options: { count: "exact" },
        payload: { role: "member" }
      })
    ]);
  });
});

function createFakeAdminClient({
  rows,
  writeCounts
}: {
  rows: MembershipRow[];
  writeCounts: number[];
}) {
  const operations: Operation[] = [];
  const state = rows.map((row) => ({ ...row }));
  const admin = {
    from(table: string) {
      if (table !== "household_memberships") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return new FakeHouseholdMembershipsQuery({
        operations,
        state,
        writeCounts
      });
    }
  };

  return { admin, operations };
}

class FakeHouseholdMembershipsQuery {
  private filters: Array<[string, unknown]> = [];
  private operation: Operation["type"] | null = null;
  private options: unknown = undefined;
  private payload: unknown = undefined;
  private readonly operations: Operation[];
  private readonly state: MembershipRow[];
  private readonly writeCounts: number[];

  constructor({
    operations,
    state,
    writeCounts
  }: {
    operations: Operation[];
    state: MembershipRow[];
    writeCounts: number[];
  }) {
    this.operations = operations;
    this.state = state;
    this.writeCounts = writeCounts;
  }

  delete(options: unknown) {
    this.operation = "delete";
    this.options = options;
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push([field, value]);
    return this;
  }

  select() {
    this.operation = "select";
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  update(payload: unknown, options: unknown) {
    this.operation = "update";
    this.options = options;
    this.payload = payload;
    return this;
  }

  private execute(): QueryResult {
    if (!this.operation) {
      throw new Error("Missing query operation.");
    }

    this.operations.push({
      filters: this.filters,
      options: this.options,
      payload: this.payload,
      type: this.operation
    });

    if (this.operation === "select") {
      return {
        data: this.state.filter((row) => matchesFilters(row, this.filters)),
        error: null
      };
    }

    const count = this.writeCounts.shift() ?? countMatchingRows(
      this.state,
      this.filters
    );

    if (this.operation === "delete") {
      deleteMatchingRows(this.state, this.filters, count);
    }

    if (
      this.operation === "update" &&
      count === 1 &&
      isRoleUpdatePayload(this.payload)
    ) {
      for (const row of this.state) {
        if (matchesFilters(row, this.filters)) {
          row.role = this.payload.role;
        }
      }
    }

    return {
      count,
      error: null
    };
  }
}

type QueryResult =
  | {
      data: MembershipRow[];
      error: null;
    }
  | {
      count: number;
      error: null;
    };

function countMatchingRows(
  rows: MembershipRow[],
  filters: Array<[string, unknown]>
) {
  return rows.filter((row) => matchesFilters(row, filters)).length;
}

function deleteMatchingRows(
  rows: MembershipRow[],
  filters: Array<[string, unknown]>,
  count: number
) {
  if (count !== 1) {
    return;
  }

  const index = rows.findIndex((row) => matchesFilters(row, filters));

  if (index >= 0) {
    rows.splice(index, 1);
  }
}

function isRoleUpdatePayload(payload: unknown): payload is { role: string } {
  return (
    !!payload &&
    typeof payload === "object" &&
    "role" in payload &&
    typeof payload.role === "string"
  );
}

function matchesFilters(row: MembershipRow, filters: Array<[string, unknown]>) {
  return filters.every(([field, value]) => row[field as keyof MembershipRow] === value);
}
