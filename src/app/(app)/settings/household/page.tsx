import { linkExistingHouseholdMember } from "@/app/(app)/settings/household/actions";
import {
  getHouseholdMemberSettings,
  type HouseholdMemberForSettings
} from "@/lib/household/data";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type HouseholdSettingsPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function HouseholdSettingsPage({
  searchParams
}: HouseholdSettingsPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const { message } = await searchParams;

  if (!householdContext.household || !householdContext.user) {
    return null;
  }

  const memberSettings = await getHouseholdMemberSettings(
    householdContext.household.id
  );
  const isOwner = householdContext.membership?.role === "owner";

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Household access
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Household
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Link existing MealBoard auth users to this household. This preparation
          slice does not send email, remove members, transfer ownership, or
          support multiple households per login yet.
        </p>
      </div>

      {message ? (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-xl font-semibold">
          {householdContext.household.name}
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-muted-foreground">Signed in as</dt>
            <dd className="mt-1">{householdContext.user.email}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Your role</dt>
            <dd className="mt-1 capitalize">
              {householdContext.membership?.role ?? "member"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Link existing user</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Create the auth account first, then link that email here as a member.
          This keeps the app on the current one-household-per-login model.
        </p>
        {!memberSettings.adminLookupAvailable ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Add `SUPABASE_SERVICE_ROLE_KEY` on the server to look up auth users
            and link members from this page.
          </p>
        ) : null}
        <form action={linkExistingHouseholdMember} className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-sm font-medium">
            Existing auth user email
            <input
              className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              disabled={!isOwner || !memberSettings.adminLookupAvailable}
              name="email"
              placeholder="elaine@example.com"
              required
              type="email"
            />
          </label>
          <button
            className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isOwner || !memberSettings.adminLookupAvailable}
            type="submit"
          >
            Link member
          </button>
        </form>
        {!isOwner ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Only household owners can link members.
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Members</h2>
        <div className="mt-4 grid gap-3">
          {memberSettings.members.map((member) => (
            <MemberCard member={member} key={member.id} />
          ))}
        </div>
      </section>
    </section>
  );
}

function MemberCard({ member }: { member: HouseholdMemberForSettings }) {
  return (
    <article className="rounded-md border border-border bg-background p-4 text-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">
            {member.email ?? `User ${member.userId.slice(0, 8)}`}
          </h3>
          <p className="mt-1 break-all text-xs text-muted-foreground">
            {member.userId}
          </p>
        </div>
        <p className="capitalize text-muted-foreground">{member.role}</p>
      </div>
    </article>
  );
}
