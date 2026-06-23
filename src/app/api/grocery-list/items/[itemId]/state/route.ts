import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { updateGroceryListItemState } from "@/lib/grocery/data";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type RouteContext = {
  params: Promise<{
    itemId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { itemId } = await context.params;

  if (!itemId) {
    return NextResponse.json(
      { error: "Choose a grocery item first." },
      { status: 400 }
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Grocery item update payload is required." },
      { status: 400 }
    );
  }

  const updates = parseGroceryItemStatePayload(payload);

  if (!updates) {
    return NextResponse.json(
      { error: "Choose an item state to update." },
      { status: 400 }
    );
  }

  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    return NextResponse.json(
      { error: "Link your user to a household first." },
      { status: 401 }
    );
  }

  try {
    await updateGroceryListItemState({
      ...updates,
      householdId: householdContext.household.id,
      itemId
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Grocery item update failed."
      },
      { status: 400 }
    );
  }

  revalidatePath("/grocery-list");

  return NextResponse.json({ ok: true });
}

function parseGroceryItemStatePayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const candidate = payload as {
    alreadyHave?: unknown;
    checked?: unknown;
  };
  const updates: {
    alreadyHave?: boolean;
    checked?: boolean;
  } = {};

  if (typeof candidate.alreadyHave === "boolean") {
    updates.alreadyHave = candidate.alreadyHave;
  }

  if (typeof candidate.checked === "boolean") {
    updates.checked = candidate.checked;
  }

  return Object.keys(updates).length > 0 ? updates : null;
}
