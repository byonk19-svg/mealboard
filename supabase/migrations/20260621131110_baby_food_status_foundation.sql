create type public.baby_food_status as enum (
  'tried',
  'liked',
  'disliked'
);

grant usage on type public.baby_food_status to authenticated, service_role;

create table public.baby_food_statuses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_profile_id uuid not null,
  food_id uuid not null,
  status public.baby_food_status not null,
  notes text,
  prep_notes text,
  last_offered_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (baby_profile_id, food_id),
  check (notes is null or length(trim(notes)) > 0),
  check (prep_notes is null or length(trim(prep_notes)) > 0),
  foreign key (baby_profile_id, household_id)
    references public.meal_profiles(id, household_id)
    on delete cascade,
  foreign key (food_id, household_id)
    references public.foods(id, household_id)
    on delete cascade
);

create or replace function public.assert_baby_food_status_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from (
      select profiles.id
      from public.meal_profiles profiles
      where profiles.household_id = new.household_id
        and profiles.profile_type = 'baby'
        and profiles.archived_at is null
      order by profiles.sort_order asc, profiles.name asc
      limit 1
    ) canonical_baby_profile
    where canonical_baby_profile.id = new.baby_profile_id
  ) then
    raise exception 'Baby food statuses can only be saved for the household Baby profile.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.assert_baby_food_status_profile() from public;
grant execute on function public.assert_baby_food_status_profile()
  to authenticated, service_role;

create trigger assert_baby_food_status_profile
  before insert or update of household_id, baby_profile_id
  on public.baby_food_statuses
  for each row execute function public.assert_baby_food_status_profile();

create trigger set_baby_food_statuses_updated_at
  before update on public.baby_food_statuses
  for each row execute function public.set_updated_at();

grant select, insert, update, delete
  on public.baby_food_statuses to authenticated, service_role;

alter table public.baby_food_statuses enable row level security;

create policy "Household members can manage baby food statuses"
  on public.baby_food_statuses
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create index baby_food_statuses_household_id_idx
  on public.baby_food_statuses (household_id);

create index baby_food_statuses_baby_profile_id_idx
  on public.baby_food_statuses (baby_profile_id);

create index baby_food_statuses_food_id_idx
  on public.baby_food_statuses (food_id);

create index baby_food_statuses_status_idx
  on public.baby_food_statuses (status);

create index baby_food_statuses_last_offered_on_idx
  on public.baby_food_statuses (last_offered_on desc)
  where last_offered_on is not null;
