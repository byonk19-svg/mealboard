import { updateMealProfile } from "@/app/(app)/settings/actions";
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
          slice keeps editing limited to profile notes and existing target
          fields.
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
        ) : (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Baby and shared-family planning details stay read-only in this
            slice.
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
  name,
  value
}: {
  label: string;
  name: string;
  value: number | null;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        defaultValue={value ?? ""}
        min={1}
        name={name}
        type="number"
      />
    </label>
  );
}

function SettingsMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}
