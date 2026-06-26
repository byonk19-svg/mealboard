import { updateMealProfile } from "@/app/(app)/settings/actions";
import { resolveBabyStage } from "@/lib/baby/resolve-baby-stage";
import {
  formatProfileType,
  type MealProfile
} from "@/lib/settings/types";
import { getMealProfiles } from "@/lib/settings/data";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type ProfilesPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function ProfilesPage({
  searchParams
}: ProfilesPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const { message } = await searchParams;

  if (!householdContext.household) {
    return null;
  }

  const profiles = await getMealProfiles(householdContext.household.id);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Settings</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Profiles
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Manage the household meal profiles created by the seed data. This
          slice keeps editing limited to profile notes, adult calorie targets,
          and Baby age/stage setup.
        </p>
      </div>

      {message ? <SettingsMessage message={message} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {profiles.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} />
        ))}
      </div>
    </section>
  );
}

function ProfileCard({ profile }: { profile: MealProfile }) {
  const isAdult = profile.profile_type === "adult";
  const isBaby = profile.profile_type === "baby";
  const babyStage = isBaby
    ? resolveBabyStage({
        asOfDate: new Date(),
        birthdate: profile.birthdate,
        overrideMonths: profile.baby_stage_override_months
      })
    : null;

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {formatProfileType(profile.profile_type)}
          </p>
          <h2 className="mt-1 text-2xl font-semibold">{profile.name}</h2>
        </div>
        {profile.color_label ? (
          <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
            {profile.color_label}
          </span>
        ) : null}
      </div>

      <form action={updateMealProfile} className="mt-5 space-y-4">
        <input name="profileId" type="hidden" value={profile.id} />

        <label className="block text-sm font-medium" htmlFor={`${profile.id}-notes`}>
          Notes
        </label>
        <textarea
          className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          defaultValue={profile.notes ?? ""}
          id={`${profile.id}-notes`}
          name="notes"
          placeholder="Preference context, schedule notes, or setup reminders"
        />

        {isAdult ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <NumberField
              label="Default calories"
              name="defaultDailyCalorieTarget"
              value={profile.default_daily_calorie_target}
            />
            <NumberField
              label="Work day"
              name="workDayCalorieTarget"
              value={profile.work_day_calorie_target}
            />
            <NumberField
              label="Off day"
              name="offDayCalorieTarget"
              value={profile.off_day_calorie_target}
            />
          </div>
        ) : isBaby ? (
          <div className="space-y-4">
            <BabyStageSummary resolution={babyStage} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Birthdate
                <input
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  defaultValue={profile.birthdate ?? ""}
                  name="birthdate"
                  type="date"
                />
              </label>
              <NumberField
                label="Stage override months"
                min={0}
                name="babyStageOverrideMonths"
                value={profile.baby_stage_override_months}
              />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Leave the override blank to use age from birthdate. Use the
              override only when baby&apos;s solids stage is ahead or behind
              calendar age.
            </p>
          </div>
        ) : (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Shared-family planning details are managed through recipes,
            staples, and weekly plans.
          </p>
        )}

        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          type="submit"
        >
          Save profile
        </button>
      </form>
    </article>
  );
}

function NumberField({
  label,
  min = 1,
  name,
  value
}: {
  label: string;
  min?: number;
  name: string;
  value: number | null;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        defaultValue={value ?? ""}
        min={min}
        name={name}
        type="number"
      />
    </label>
  );
}

function BabyStageSummary({
  resolution
}: {
  resolution: ReturnType<typeof resolveBabyStage> | null;
}) {
  if (!resolution || resolution.setupWarning) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {resolution?.setupWarning ??
          "Add baby's birthdate for better solids planning."}
      </p>
    );
  }

  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
      <p className="font-medium">
        {resolution.stageName ?? "Stage not matched yet"}
        {resolution.usedOverride ? " (manual override)" : ""}
      </p>
      <p className="mt-1 text-muted-foreground">
        {formatBabyAgeText(resolution.ageMonths)} Stage month:{" "}
        {resolution.effectiveStageMonths}.
      </p>
    </div>
  );
}

function formatBabyAgeText(ageMonths: number | null) {
  if (ageMonths === null) {
    return "Age not set.";
  }

  return `Age: ${ageMonths} ${ageMonths === 1 ? "month" : "months"}.`;
}

function SettingsMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}
