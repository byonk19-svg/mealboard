export type BabyGuidanceStage = {
  id: string;
  maxMonths: number;
  minMonths: number;
  stageName: string;
};

export type BabyStageResolution = {
  ageMonths: number | null;
  effectiveStageMonths: number | null;
  guidanceStageId: string | null;
  setupWarning: string | null;
  stageName: string | null;
  usedOverride: boolean;
};

export const defaultBabyGuidanceStages = [
  {
    id: "supported-start",
    maxMonths: 6,
    minMonths: 4,
    stageName: "Supported start"
  },
  {
    id: "texture-building",
    maxMonths: 9,
    minMonths: 7,
    stageName: "Texture building"
  },
  {
    id: "family-food-practice",
    maxMonths: 12,
    minMonths: 10,
    stageName: "Family food practice"
  },
  {
    id: "toddler-transition",
    maxMonths: 24,
    minMonths: 13,
    stageName: "Toddler transition"
  }
] as const satisfies readonly BabyGuidanceStage[];

export function resolveBabyStage({
  asOfDate,
  birthdate,
  guidanceStages = defaultBabyGuidanceStages,
  overrideMonths = null
}: {
  asOfDate: Date | string;
  birthdate: Date | string | null;
  guidanceStages?: readonly BabyGuidanceStage[];
  overrideMonths?: number | null;
}): BabyStageResolution {
  const ageMonths = birthdate
    ? calculateCompletedMonths(parseDateInput(birthdate), parseDateInput(asOfDate))
    : null;
  const hasOverride =
    typeof overrideMonths === "number" && Number.isFinite(overrideMonths);
  const effectiveStageMonths = hasOverride ? overrideMonths : ageMonths;

  if (effectiveStageMonths === null) {
    return {
      ageMonths,
      effectiveStageMonths: null,
      guidanceStageId: null,
      setupWarning:
        "Add baby's birthdate or a stage override for better solids planning.",
      stageName: null,
      usedOverride: false
    };
  }

  const stage =
    guidanceStages.find(
      (candidate) =>
        effectiveStageMonths >= candidate.minMonths &&
        effectiveStageMonths <= candidate.maxMonths
    ) ?? null;

  return {
    ageMonths,
    effectiveStageMonths,
    guidanceStageId: stage?.id ?? null,
    setupWarning: null,
    stageName: stage?.stageName ?? null,
    usedOverride: hasOverride
  };
}

function calculateCompletedMonths(birthdate: Date, asOfDate: Date) {
  const rawMonths =
    (asOfDate.getUTCFullYear() - birthdate.getUTCFullYear()) * 12 +
    asOfDate.getUTCMonth() -
    birthdate.getUTCMonth();
  const hasReachedMonthDay = asOfDate.getUTCDate() >= birthdate.getUTCDate();
  const completedMonths = hasReachedMonthDay ? rawMonths : rawMonths - 1;

  return Math.max(0, completedMonths);
}

function parseDateInput(value: Date | string) {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    );
  }

  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}
