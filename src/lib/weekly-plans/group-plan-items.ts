import type { MealProfile } from "@/lib/settings/types";
import type { BabyPlanSlot, WeeklyPlanItem } from "./types";

export type PlanItemProfileGroupItem = {
  item: WeeklyPlanItem;
  slotLabel: string;
};

export type PlanItemProfileGroup = {
  items: PlanItemProfileGroupItem[];
  profileId: string | null;
  profileName: string;
};

export function buildPlanItemsByProfile({
  planItems,
  profiles = []
}: {
  planItems: WeeklyPlanItem[];
  profiles?: Pick<MealProfile, "id" | "name">[];
}): PlanItemProfileGroup[] {
  const groupsByProfile = new Map<string, PlanItemProfileGroup>();

  profiles.forEach((profile) => {
    groupsByProfile.set(profile.id, {
      items: [],
      profileId: profile.id,
      profileName: profile.name
    });
  });

  for (const item of planItems) {
    const groupKey = item.meal_profile_id ?? `name:${item.meal_profile_name ?? "Unassigned"}`;
    const profileName = item.meal_profile_name ?? "Unassigned";
    const group = groupsByProfile.get(groupKey) ?? {
      items: [],
      profileId: item.meal_profile_id,
      profileName
    };
    group.items.push({
      item,
      slotLabel: getPlanItemSlotLabel(item)
    });
    groupsByProfile.set(groupKey, group);
  }

  return Array.from(groupsByProfile.values());
}

export function getPlanItemSlotLabel(item: WeeklyPlanItem) {
  if (item.baby_plan_slot) {
    return formatBabyPlanSlotLabel(item.baby_plan_slot);
  }

  return item.meal_type;
}

export function formatBabyPlanSlotLabel(slot: BabyPlanSlot) {
  const labels: Record<BabyPlanSlot, string> = {
    baby_meal_1: "Baby Meal 1",
    baby_meal_2: "Baby Meal 2"
  };

  return labels[slot];
}
