alter table public.pantry_intake_decisions
  add column decided_by_user_id uuid references auth.users(id) on delete restrict;

alter table public.pantry_consumption_decisions
  add column decided_by_user_id uuid references auth.users(id) on delete restrict;

create function public.set_pantry_decision_actor()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
begin
  if acting_user_id is not null then
    if new.decided_by_user_id is null then
      new.decided_by_user_id := acting_user_id;
    elsif new.decided_by_user_id is distinct from acting_user_id then
      raise exception 'Pantry decision actor must match the authenticated user.'
        using errcode = '42501';
    end if;
  elsif new.decided_by_user_id is null then
    raise exception 'Pantry decision actor is required for privileged inserts.'
      using errcode = '23502';
  end if;

  if new.decided_by_user_id is not null and not exists (
    select 1
    from public.household_memberships memberships
    where memberships.household_id = new.household_id
      and memberships.user_id = new.decided_by_user_id
  ) then
    raise exception 'Pantry decision actor must be a household member.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger set_pantry_intake_decision_actor
  before insert on public.pantry_intake_decisions
  for each row execute function public.set_pantry_decision_actor();

create trigger set_pantry_consumption_decision_actor
  before insert on public.pantry_consumption_decisions
  for each row execute function public.set_pantry_decision_actor();

create index pantry_intake_decisions_decided_by_user_id_idx
  on public.pantry_intake_decisions (household_id, decided_by_user_id)
  where decided_by_user_id is not null;

create index pantry_consumption_decisions_decided_by_user_id_idx
  on public.pantry_consumption_decisions (household_id, decided_by_user_id)
  where decided_by_user_id is not null;
