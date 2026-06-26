import {
  deleteBabyFoodStatus,
  saveBabyFoodStatus,
  updateMealProfile
} from "@/app/(app)/settings/actions";
import {
  buildBabySettingsSummary,
  getBabyProfile
} from "@/lib/settings/baby-settings";
import { getBabyGuidanceForStage } from "@/lib/baby/baby-guidance";
import { generateBabyMeals } from "@/lib/baby/generate-baby-meals";
import { suggestBabyTryThis } from "@/lib/baby/suggest-baby-try-this";
import {
  buildBabyTryThisStatusDefaults,
  type BabyTryThisStatusDefaults
} from "@/lib/baby/try-this-handoff";
import {
  getBabyFoodStatuses,
  getFoodPreferences,
  getFoods,
  getMealProfiles
} from "@/lib/settings/data";
import {
  babyFoodStatuses as babyFoodStatusOptions,
  buildBabyFoodStatusSummary,
  formatBabyFoodStatus
} from "@/lib/settings/baby-food-statuses";
import type {
  BabyFoodStatusEntry,
  Food,
  MealProfile
} from "@/lib/settings/types";
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

  const today = new Date();
  const [profiles, foods, foodPreferences] = await Promise.all([
    getMealProfiles(householdContext.household.id),
    getFoods(householdContext.household.id, undefined, { limit: null }),
    getFoodPreferences(householdContext.household.id)
  ]);
  const babyProfile = getBabyProfile(profiles);
  const summary = buildBabySettingsSummary(babyProfile, today);
  const babyFoodStatuses = babyProfile
    ? await getBabyFoodStatuses(householdContext.household.id, babyProfile.id)
    : [];
  const babyMealSuggestions = generateBabyMeals(babyFoodStatuses, {
    stageName: summary.resolution?.stageName
  });
  const babyGuidance = getBabyGuidanceForStage(
    summary.resolution?.guidanceStageId ?? null
  );
  const blockedBabyFoodIds = babyProfile
    ? foodPreferences
        .filter(
          (preference) =>
            preference.meal_profile_id === babyProfile.id &&
            (preference.preference === "hard_no" ||
              preference.preference === "allergy")
        )
        .map((preference) => preference.food_id)
    : [];
  const babyTryThis = suggestBabyTryThis({
    blockedFoodIds: blockedBabyFoodIds,
    foods,
    stageReady: Boolean(babyGuidance),
    statuses: babyFoodStatuses
  });
  const babyTryThisDefaults = buildBabyTryThisStatusDefaults({
    candidate: babyTryThis.candidate,
    today
  });

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

      {babyProfile && babyGuidance ? (
        <BabyGuidancePanel guidance={babyGuidance} />
      ) : null}

      {babyProfile ? <BabyProfileForm profile={babyProfile} /> : null}

      {babyProfile ? (
        <BabyFoodsPanel
          babyFoodStatuses={babyFoodStatuses}
          foods={foods}
          profile={babyProfile}
        />
      ) : null}

      {babyProfile ? (
        <BabyMealPreview babyMealSuggestions={babyMealSuggestions} />
      ) : null}

      {babyProfile ? (
        <BabyTryThisPreview
          profile={babyProfile}
          statusDefaults={babyTryThisDefaults}
          tryThis={babyTryThis}
        />
      ) : null}

      <section className="rounded-lg border border-dashed border-border bg-card p-5">
        <h2 className="text-xl font-semibold">Still out of scope</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Nutrition, milk intake, and reaction tracking stay out of MealBoard
          MVP. Routine Baby Meal 1/2 items can be applied to Plan Week, and
          approved baby food rows can flow into groceries.
        </p>
      </section>
    </section>
  );
}

function BabyGuidancePanel({
  guidance
}: {
  guidance: NonNullable<ReturnType<typeof getBabyGuidanceForStage>>;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Stage guidance
        </p>
        <h2 className="mt-2 text-xl font-semibold">
          {guidance.stageName}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {guidance.summary}
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border bg-background p-4">
          <h3 className="text-base font-semibold">Routine meals</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {guidance.routineMealFocus}
          </p>
        </div>
        <div className="rounded-md border border-border bg-background p-4">
          <h3 className="text-base font-semibold">Try This</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {guidance.tryThisFocus}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-border bg-background p-4">
        <h3 className="text-base font-semibold">Texture notes</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {guidance.textureTips.map((tip) => (
            <li
              className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
              key={tip}
            >
              {tip}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {guidance.safetyNote}
        </p>
      </div>
    </section>
  );
}

function BabyMealPreview({
  babyMealSuggestions
}: {
  babyMealSuggestions: ReturnType<typeof generateBabyMeals>;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Routine preview
        </p>
        <h2 className="mt-2 text-xl font-semibold">
          Baby Meal 1 and Baby Meal 2
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          This preview uses tried and liked foods only. Disliked foods, new
          foods, grocery behavior, and weekly plan writes stay separate.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {babyMealSuggestions.slots.map((slot) => (
          <article
            className="rounded-md border border-border bg-background p-4"
            key={slot.slot}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{slot.label}</h3>
              {slot.status ? (
                <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                  {formatBabyFoodStatus(slot.status)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm font-medium">
              {slot.foodName ?? "Needs another tried or liked food"}
            </p>
            {slot.lastOfferedOn ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Last offered: {formatLastOfferedOn(slot.lastOfferedOn)}
              </p>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {slot.reason}
            </p>
            {slot.notes ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {slot.notes}
              </p>
            ) : null}
            {slot.prepNotes ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Prep: {slot.prepNotes}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      {babyMealSuggestions.warnings.length > 0 ? (
        <div className="mt-4 space-y-2">
          {babyMealSuggestions.warnings.map((warning) => (
            <p
              className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
              key={warning}
            >
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function BabyTryThisPreview({
  profile,
  statusDefaults,
  tryThis
}: {
  profile: MealProfile;
  statusDefaults: BabyTryThisStatusDefaults | null;
  tryThis: ReturnType<typeof suggestBabyTryThis>;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Try This</p>
        <h2 className="mt-2 text-xl font-semibold">
          One new food idea at a time
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          This preview uses foods that are not yet tracked as tried, liked, or
          disliked. It does not add anything to the weekly plan or grocery list.
        </p>
      </div>

      <div className="mt-5 rounded-md border border-border bg-background p-4">
        {tryThis.candidate ? (
          <>
            <h3 className="text-lg font-semibold">
              {tryThis.candidate.foodName}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {tryThis.candidate.reason}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {tryThis.availableFoodCount} untracked{" "}
              {tryThis.availableFoodCount === 1 ? "food" : "foods"} available
              for future Try This ideas.
            </p>
            {statusDefaults ? (
              <form action={saveBabyFoodStatus} className="mt-4 space-y-3">
                <input name="babyProfileId" type="hidden" value={profile.id} />
                <input
                  name="foodId"
                  type="hidden"
                  value={statusDefaults.foodId}
                />
                <input
                  name="notes"
                  type="hidden"
                  value={statusDefaults.notes}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Try This status
                    <select
                      className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      defaultValue={statusDefaults.status}
                      name="status"
                    >
                      {babyFoodStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {formatBabyFoodStatus(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">
                    Last offered
                    <input
                      className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      defaultValue={statusDefaults.lastOfferedOn}
                      name="lastOfferedOn"
                      type="date"
                    />
                  </label>
                </div>
                <button
                  className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  type="submit"
                >
                  Track Try This food
                </button>
              </form>
            ) : null}
          </>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            {tryThis.warning}
          </p>
        )}
      </div>
    </section>
  );
}

function BabyFoodsPanel({
  babyFoodStatuses,
  foods,
  profile
}: {
  babyFoodStatuses: BabyFoodStatusEntry[];
  foods: Food[];
  profile: MealProfile;
}) {
  const statusSummary = buildBabyFoodStatusSummary(babyFoodStatuses);

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Baby foods
        </p>
        <h2 className="mt-2 text-xl font-semibold">
          Tried, liked, and disliked foods
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Track simple solids status for existing foods. This is planning
          context only, not reaction or medical tracking.
        </p>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-4">
        <StageMetric label="Tracked" value={String(statusSummary.total)} />
        <StageMetric label="Tried" value={String(statusSummary.tried)} />
        <StageMetric label="Liked" value={String(statusSummary.liked)} />
        <StageMetric label="Disliked" value={String(statusSummary.disliked)} />
      </dl>

      <div className="mt-5 rounded-md border border-border bg-background p-4">
        <h3 className="text-lg font-semibold">Add or update baby food</h3>
        <BabyFoodStatusForm
          foods={foods}
          profile={profile}
          submitLabel="Save baby food"
        />
      </div>

      <div className="mt-5 space-y-3">
        {babyFoodStatuses.length > 0 ? (
          babyFoodStatuses.map((status) => (
            <BabyFoodStatusCard
              babyFoodStatus={status}
              foods={foods}
              key={status.id}
              profile={profile}
            />
          ))
        ) : (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            No baby foods tracked yet.
          </p>
        )}
      </div>
    </section>
  );
}

function BabyFoodStatusCard({
  babyFoodStatus,
  foods,
  profile
}: {
  babyFoodStatus: BabyFoodStatusEntry;
  foods: Food[];
  profile: MealProfile;
}) {
  return (
    <article className="rounded-md border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">
              {babyFoodStatus.food_name}
            </h3>
            <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
              {formatBabyFoodStatus(babyFoodStatus.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Last offered: {formatLastOfferedOn(babyFoodStatus.last_offered_on)}
          </p>
          {babyFoodStatus.notes ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {babyFoodStatus.notes}
            </p>
          ) : null}
          {babyFoodStatus.prep_notes ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Prep: {babyFoodStatus.prep_notes}
            </p>
          ) : null}
        </div>
        <form action={deleteBabyFoodStatus}>
          <input
            name="babyFoodStatusId"
            type="hidden"
            value={babyFoodStatus.id}
          />
          <button
            className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            type="submit"
          >
            Delete
          </button>
        </form>
      </div>

      <BabyFoodStatusForm
        babyFoodStatus={babyFoodStatus}
        foods={foods}
        profile={profile}
        submitLabel="Update baby food"
      />
    </article>
  );
}

function BabyFoodStatusForm({
  babyFoodStatus,
  foods,
  profile,
  submitLabel
}: {
  babyFoodStatus?: BabyFoodStatusEntry;
  foods: Food[];
  profile: MealProfile;
  submitLabel: string;
}) {
  return (
    <form action={saveBabyFoodStatus} className="mt-4 space-y-4">
      <input name="babyProfileId" type="hidden" value={profile.id} />
      {babyFoodStatus ? (
        <input
          name="babyFoodStatusId"
          type="hidden"
          value={babyFoodStatus.id}
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm font-medium">
          Food
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={babyFoodStatus?.food_id ?? ""}
            name="foodId"
            required
          >
            <option disabled value="">
              {foods.length > 0 ? "Choose food" : "No foods available"}
            </option>
            {foods.map((food) => (
              <option key={food.id} value={food.id}>
                {food.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Status
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={babyFoodStatus?.status ?? "tried"}
            name="status"
          >
            {babyFoodStatusOptions.map((status) => (
              <option key={status} value={status}>
                {formatBabyFoodStatus(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Last offered
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={babyFoodStatus?.last_offered_on ?? ""}
            name="lastOfferedOn"
            type="date"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-medium">
          Notes
          <textarea
            className="mt-1 min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={babyFoodStatus?.notes ?? ""}
            name="notes"
            placeholder="Plain-language planning context"
          />
        </label>

        <label className="block text-sm font-medium">
          Prep notes
          <textarea
            className="mt-1 min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={babyFoodStatus?.prep_notes ?? ""}
            name="prepNotes"
            placeholder="Mashed, soft pieces, mixed into yogurt"
          />
        </label>
      </div>

      <button
        className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={foods.length === 0}
        type="submit"
      >
        {submitLabel}
      </button>
    </form>
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

function formatLastOfferedOn(value: string | null) {
  return value ?? "Not tracked";
}

function formatMonthValue(value: number | null) {
  if (value === null) {
    return "Not set";
  }

  return `${value} ${value === 1 ? "month" : "months"}`;
}
