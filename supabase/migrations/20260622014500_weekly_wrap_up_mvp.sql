create table public.weekly_wrap_ups (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  weekly_plan_id uuid not null,
  status text not null default 'open',
  dismissed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (weekly_plan_id),
  check (status in ('open', 'dismissed', 'completed')),
  foreign key (weekly_plan_id, household_id)
    references public.weekly_plans(id, household_id)
    on delete cascade
);

create table public.weekly_wrap_up_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  weekly_wrap_up_id uuid not null,
  weekly_plan_item_id uuid,
  grocery_list_item_id uuid,
  prompt_type text not null,
  status text not null default 'pending',
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  check (prompt_type in ('recipe_review', 'unused_grocery_item')),
  check (status in ('pending', 'completed', 'dismissed')),
  foreign key (weekly_wrap_up_id, household_id)
    references public.weekly_wrap_ups(id, household_id)
    on delete cascade,
  foreign key (weekly_plan_item_id, household_id)
    references public.weekly_plan_items(id, household_id)
    on delete set null (weekly_plan_item_id),
  foreign key (grocery_list_item_id, household_id)
    references public.grocery_list_items(id, household_id)
    on delete set null (grocery_list_item_id)
);

create unique index weekly_wrap_up_items_plan_item_prompt_key
  on public.weekly_wrap_up_items (weekly_wrap_up_id, weekly_plan_item_id, prompt_type)
  where weekly_plan_item_id is not null;

create unique index weekly_wrap_up_items_grocery_item_prompt_key
  on public.weekly_wrap_up_items (weekly_wrap_up_id, grocery_list_item_id, prompt_type)
  where grocery_list_item_id is not null;

create trigger set_weekly_wrap_ups_updated_at
  before update on public.weekly_wrap_ups
  for each row execute function public.set_updated_at();

create trigger set_weekly_wrap_up_items_updated_at
  before update on public.weekly_wrap_up_items
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.weekly_wrap_ups to authenticated, service_role;
grant select, insert, update, delete on public.weekly_wrap_up_items to authenticated, service_role;

alter table public.weekly_wrap_ups enable row level security;
alter table public.weekly_wrap_up_items enable row level security;

create policy "Household members can manage weekly wrap ups"
  on public.weekly_wrap_ups
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage weekly wrap up items"
  on public.weekly_wrap_up_items
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create index weekly_wrap_ups_household_id_idx
  on public.weekly_wrap_ups (household_id);

create index weekly_wrap_ups_weekly_plan_id_idx
  on public.weekly_wrap_ups (weekly_plan_id);

create index weekly_wrap_up_items_household_id_idx
  on public.weekly_wrap_up_items (household_id);

create index weekly_wrap_up_items_weekly_wrap_up_id_idx
  on public.weekly_wrap_up_items (weekly_wrap_up_id);

create index weekly_wrap_up_items_status_idx
  on public.weekly_wrap_up_items (status);
