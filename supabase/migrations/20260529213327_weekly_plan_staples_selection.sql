create table public.weekly_plan_staples (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  weekly_plan_id uuid not null,
  staple_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (weekly_plan_id, staple_id),
  foreign key (weekly_plan_id, household_id)
    references public.weekly_plans(id, household_id)
    on delete cascade,
  foreign key (staple_id, household_id)
    references public.staples(id, household_id)
    on delete cascade
);

create trigger set_weekly_plan_staples_updated_at
  before update on public.weekly_plan_staples
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.weekly_plan_staples to authenticated, service_role;

alter table public.weekly_plan_staples enable row level security;

create policy "Household members can manage weekly plan staples"
  on public.weekly_plan_staples
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create index weekly_plan_staples_household_id_idx
  on public.weekly_plan_staples (household_id);

create index weekly_plan_staples_weekly_plan_id_idx
  on public.weekly_plan_staples (weekly_plan_id);

create index weekly_plan_staples_staple_id_idx
  on public.weekly_plan_staples (staple_id);
