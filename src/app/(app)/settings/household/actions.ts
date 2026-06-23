"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  linkExistingUserToHousehold,
  removeHouseholdMember
} from "@/lib/household/data";
import { normalizeHouseholdMemberEmail } from "@/lib/household/members";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

function householdRedirect(message: string): never {
  redirect(`/settings/household?message=${encodeURIComponent(message)}`);
}

export async function linkExistingHouseholdMember(formData: FormData) {
  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household || !householdContext.user) {
    householdRedirect("Link your user to a household before editing sharing.");
  }

  let email: string;

  try {
    email = normalizeHouseholdMemberEmail(formData.get("email"));
  } catch (error) {
    householdRedirect(
      error instanceof Error ? error.message : "Member email could not be used."
    );
  }

  try {
    await linkExistingUserToHousehold({
      actorRole: householdContext.membership?.role ?? null,
      email,
      householdId: householdContext.household.id
    });
  } catch (error) {
    householdRedirect(
      error instanceof Error
        ? error.message
        : "Household member could not be linked."
    );
  }

  revalidatePath("/settings/household");
  householdRedirect(`Linked ${email} to this household.`);
}

export async function removeHouseholdMemberAction(formData: FormData) {
  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household || !householdContext.user) {
    householdRedirect("Link your user to a household before editing sharing.");
  }

  const membershipId = String(formData.get("membershipId") ?? "").trim();

  if (!membershipId) {
    householdRedirect("Choose a household member first.");
  }

  try {
    await removeHouseholdMember({
      actorRole: householdContext.membership?.role ?? null,
      actorUserId: householdContext.user.id,
      householdId: householdContext.household.id,
      membershipId
    });
  } catch (error) {
    householdRedirect(
      error instanceof Error
        ? error.message
        : "Household member could not be removed."
    );
  }

  revalidatePath("/settings/household");
  householdRedirect("Household member removed.");
}
