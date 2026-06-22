export type BabyGuidanceContent = {
  routineMealFocus: string;
  safetyNote: string;
  stageId: string;
  stageName: string;
  summary: string;
  textureTips: string[];
  tryThisFocus: string;
};

export const defaultBabyGuidanceContent = [
  {
    routineMealFocus:
      "Keep routine meals simple with familiar tried and liked foods.",
    safetyNote:
      "Use this as general guidance and keep following your household's feeding plan.",
    stageId: "supported-start",
    stageName: "Supported start",
    summary:
      "Early solids can stay small and predictable while the main goal is practice.",
    textureTips: ["Smooth or soft textures", "Tiny portions", "Upright support"],
    tryThisFocus:
      "Try This can stay to one new food at a time, separate from routine meals."
  },
  {
    routineMealFocus:
      "Use tried and liked foods while gradually adding more texture variety.",
    safetyNote:
      "Use this as general guidance and keep portions, texture, and pace comfortable.",
    stageId: "texture-building",
    stageName: "Texture building",
    summary:
      "This stage can practice soft textures, simple combinations, and steady variety.",
    textureTips: ["Mashed foods", "Soft pieces", "Simple combinations"],
    tryThisFocus:
      "Try This should suggest one new food separately from the familiar meal base."
  },
  {
    routineMealFocus:
      "Build routine meals from tried and liked family foods prepared safely for baby.",
    safetyNote:
      "Use this as general guidance and adjust texture and pace to what is working.",
    stageId: "family-food-practice",
    stageName: "Family food practice",
    summary:
      "Baby can practice more family-food patterns while routine meals stay familiar.",
    textureTips: ["Soft family foods", "Easy-to-hold pieces", "Mixed textures"],
    tryThisFocus:
      "Try This can introduce one new family food without changing the routine slots."
  },
  {
    routineMealFocus:
      "Keep routine meals anchored in familiar foods while variety expands.",
    safetyNote:
      "Use this as general guidance and keep the tone practical rather than clinical.",
    stageId: "toddler-transition",
    stageName: "Toddler transition",
    summary:
      "Meals can look more like the household pattern while still respecting baby preferences.",
    textureTips: ["Soft household foods", "Self-feeding practice", "Flexible portions"],
    tryThisFocus:
      "Try This can stay lightweight: one new food idea, not a required plan item."
  }
] as const satisfies readonly BabyGuidanceContent[];

export function getBabyGuidanceForStage(stageId: string | null) {
  if (!stageId) {
    return null;
  }

  return (
    defaultBabyGuidanceContent.find((content) => content.stageId === stageId) ??
    null
  );
}
