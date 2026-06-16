export type BabyProfileInput = {
  birthdate: string | null;
  stageOverrideMonths: string | null;
};

export type NormalizedBabyProfileInput = {
  babyStageOverrideMonths: number | null;
  birthdate: string | null;
};

export function normalizeBabyProfileInput(
  input: BabyProfileInput,
  options: { today?: Date | string } = {}
): NormalizedBabyProfileInput {
  const birthdate = normalizeBirthdate(input.birthdate, options.today);

  return {
    babyStageOverrideMonths: normalizeStageOverride(input.stageOverrideMonths),
    birthdate
  };
}

function normalizeBirthdate(value: string | null, todayInput?: Date | string) {
  const birthdate = normalizeText(value);

  if (!birthdate) {
    return null;
  }

  const parsedBirthdate = parseDateKey(birthdate);

  if (!parsedBirthdate || birthdate !== formatDateKey(parsedBirthdate)) {
    throw new Error("Baby birthdate must be a valid date.");
  }

  const today = normalizeToday(todayInput);

  if (parsedBirthdate > today) {
    throw new Error("Baby birthdate cannot be in the future.");
  }

  return birthdate;
}

function normalizeStageOverride(value: string | null) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const parsed = Number(text);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      "Baby stage override must be zero or a positive whole number."
    );
  }

  return parsed;
}

function normalizeText(value: string | null) {
  const text = String(value ?? "").trim();

  return text.length > 0 ? text : null;
}

function normalizeToday(value: Date | string | undefined) {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    );
  }

  const parsed = value ? parseDateKey(value) : null;

  return parsed ?? new Date();
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}
