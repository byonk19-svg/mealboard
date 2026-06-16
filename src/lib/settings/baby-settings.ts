import type { MealProfile } from "@/lib/settings/types";
import { resolveBabyStage } from "../baby/resolve-baby-stage";

const allowedReturnPaths = ["/settings/profiles", "/settings/baby"] as const;
type SettingsReturnPath = (typeof allowedReturnPaths)[number];

export type BabySettingsSummary = {
  nextStepText: string;
  resolution: ReturnType<typeof resolveBabyStage> | null;
  statusLabel: string;
  supportText: string;
};

export function getBabyProfile(profiles: MealProfile[]) {
  return (
    profiles.find((profile) => profile.profile_type === "baby") ?? null
  );
}

export function buildBabySettingsSummary(
  babyProfile: MealProfile | null,
  asOfDate: Date | string
): BabySettingsSummary {
  if (!babyProfile) {
    return {
      nextStepText:
        "Create or restore a Baby meal profile before planning baby solids.",
      resolution: null,
      statusLabel: "Baby profile missing",
      supportText:
        "MealBoard keeps baby planning tied to the household Baby profile."
    };
  }

  const resolution = resolveBabyStage({
    asOfDate,
    birthdate: babyProfile.birthdate,
    overrideMonths: babyProfile.baby_stage_override_months
  });

  if (resolution.setupWarning) {
    return {
      nextStepText:
        "Add a birthdate or manual stage override to unlock stage-aware solids planning.",
      resolution,
      statusLabel: "Stage setup needed",
      supportText: resolution.setupWarning
    };
  }

  return {
    nextStepText:
      "Stage setup is ready. Baby food statuses and meal ideas can be added in later slices.",
    resolution,
    statusLabel: resolution.stageName ?? "Stage not matched yet",
    supportText: resolution.usedOverride
      ? "Using the manual stage override for planning context."
      : "Using birthdate to estimate baby's current solids stage."
  };
}

export function resolveSettingsReturnPath(
  value: string | null
): SettingsReturnPath {
  return allowedReturnPaths.includes(value as (typeof allowedReturnPaths)[number])
    ? (value as SettingsReturnPath)
    : "/settings/profiles";
}
