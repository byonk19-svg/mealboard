import { updateMealProfile } from "@/app/(app)/settings/actions";
import {
  buildBabySettingsSummary,
  getBabyProfile
} from "@/lib/settings/baby-settings";
import { getMealProfiles } from "@/lib/settings/data";
import type { MealProfile } from "@/lib/settings/types";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type BabySettingsPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function BabySettingsPage({
  searchParams
}: BabySettingsPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const { message } = await searchParams;

  if (!householdContext.household) {
    return null;
  }

  const profiles = await getMealProfiles(householdContext.household.id);
  const babyProfile = getBabyProfile(profiles);
  const summary = buildBabySettingsSummary(babyProfile, new Date());

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Settings</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Baby Settings
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Keep baby solids planning grounded in a simple age/stage setup. This
          page does not track formula, milk intake, reactions, or medical
          details.
        </p>
      </div>

      {message ? <SettingsMessage message={message} /> : null}

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Stage context
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              {summary.statusLabel}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {summary.supportText}
            </p>
          </div>
          {summary.resolution?.usedOverride ? (
            <span className="w-fit rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
              Manual override
            </span>
          ) : null}
        </div>

        {summary.resolution ? (
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <StageMetric
              label="Age"
              value={formatMonthValue(summary.resolution.ageMonths)}
            />
            <StageMetric
              label="Stage month"
              value={formatMonthValue(summary.resolution.effectiveStageMonths)}
            />
            <StageMetric
              label="Stage"
              value={summary.resolution.stageName ?? "Not matched"}
            />
          </dl>
        ) : null}

        <p className="mt-5 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {summary.nextStepText}
        </p>
      </section>

      {babyProfile ? <BabyProfileForm profile={babyProfile} /> : null}

      <section className="rounded-lg border border-dashed border-border bg-card p-5">
        <h2 className="text-xl font-semibold">Coming later</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Baby food tried/liked/disliked status, Baby Meal 1/2 planning, and
          Try This ideas stay out of this slice so the stage foundation stays
          clean.
        </p>
      </section>
    </section>
  );
}

function BabyProfileForm({ profile }: { profile: MealProfile }) {
  return (
    <form
      action={updateMealProfile}
      className="rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <input name="profileId" type="hidden" value={profile.id} />
      <input name="returnPath" type="hidden" value="/settings/baby" />

      <h2 className="text-xl font-semibold">Age and stage</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Birthdate is used for the default stage estimate. The override is only
        for cases where solids readiness is ahead or behind calendar age.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Birthdate
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            defaultValue={profile.birthdate ?? ""}
            name="birthdate"
            type="date"
          />
        </label>

        <label className="block text-sm font-medium">
          Stage override months
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            defaultValue={profile.baby_stage_override_months ?? ""}
            min={0}
            name="babyStageOverrideMonths"
            type="number"
          />
        </label>
      </div>

      <label className="mt-4 block text-sm font-medium">
        Notes
        <textarea
          className="mt-2 min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          defaultValue={profile.notes ?? ""}
          name="notes"
          placeholder="Solids preferences, texture notes, or setup reminders"
        />
      </label>

      <button
        className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        type="submit"
      >
        Save baby settings
      </button>
    </form>
  );
}

function StageMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
    </div>
  );
}

function SettingsMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function formatMonthValue(value: number | null) {
  if (value === null) {
    return "Not set";
  }

  return `${value} ${value === 1 ? "month" : "months"}`;
}
