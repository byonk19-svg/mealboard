create type public.baby_plan_slot as enum (
  'baby_meal_1',
  'baby_meal_2'
);

grant usage on type public.baby_plan_slot to authenticated, service_role;

alter table public.weekly_plan_items
  add column food_id uuid,
  add column baby_plan_slot public.baby_plan_slot,
  add constraint weekly_plan_items_food_id_fkey
    foreign key (food_id, household_id)
    references public.foods(id, household_id)
    on delete cascade,
  add constraint weekly_plan_items_recipe_or_food_chk
    check (num_nonnulls(recipe_id, food_id) <= 1),
  add constraint weekly_plan_items_baby_slot_shape_chk
    check (
      baby_plan_slot is null
      or (
        meal_type = 'baby_meal'
        and component_type = 'baby_food'
        and recipe_id is null
        and food_id is not null
        and meal_profile_id is not null
      )
    );

create unique index weekly_plan_items_baby_slot_unique_idx
  on public.weekly_plan_items (
    weekly_plan_id,
    meal_profile_id,
    plan_date,
    baby_plan_slot
  )
  where baby_plan_slot is not null;

create index weekly_plan_items_food_id_idx
  on public.weekly_plan_items (food_id);

create or replace function public.assert_weekly_plan_item_baby_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.baby_plan_slot is not null and not exists (
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
    where canonical_baby_profile.id = new.meal_profile_id
  ) then
    raise exception 'Baby weekly plan items can only be saved for the household Baby profile.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.assert_weekly_plan_item_baby_profile() from public;
grant execute on function public.assert_weekly_plan_item_baby_profile()
  to authenticated, service_role;

create trigger assert_weekly_plan_item_baby_profile
  before insert or update of household_id, meal_profile_id, baby_plan_slot
  on public.weekly_plan_items
  for each row execute function public.assert_weekly_plan_item_baby_profile();

create or replace function public.replace_weekly_plan_baby_routine_items(
  p_household_id uuid,
  p_weekly_plan_id uuid,
  p_baby_profile_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_household_member(p_household_id) then
    raise exception 'Household access is required.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.weekly_plans plans
    where plans.id = p_weekly_plan_id
      and plans.household_id = p_household_id
  ) then
    raise exception 'That planning week is no longer available.'
      using errcode = '23503';
  end if;

  if not exists (
    select 1
    from (
      select profiles.id
      from public.meal_profiles profiles
      where profiles.household_id = p_household_id
        and profiles.profile_type = 'baby'
        and profiles.archived_at is null
      order by profiles.sort_order asc, profiles.name asc
      limit 1
    ) canonical_baby_profile
    where canonical_baby_profile.id = p_baby_profile_id
  ) then
    raise exception 'Baby weekly plan items can only be saved for the household Baby profile.'
      using errcode = '23514';
  end if;

  delete from public.weekly_plan_items existing
  where existing.household_id = p_household_id
    and existing.weekly_plan_id = p_weekly_plan_id
    and existing.meal_profile_id = p_baby_profile_id
    and existing.baby_plan_slot is not null
    and existing.is_locked = false
    and not exists (
      select 1
      from jsonb_to_recordset(p_items) as item(
        baby_plan_slot public.baby_plan_slot,
        plan_date date
      )
      where item.plan_date = existing.plan_date
        and item.baby_plan_slot = existing.baby_plan_slot
    );

  update public.weekly_plan_items target
  set
    component_type = 'baby_food',
    display_name = item.display_name,
    food_id = item.food_id,
    meal_type = 'baby_meal',
    notes = item.notes,
    reason_labels = item.reason_labels,
    recipe_id = null,
    scale_factor = 1,
    sort_order = item.sort_order,
    why_this = item.why_this
  from (
    select
      raw_item.baby_plan_slot,
      raw_item.display_name,
      raw_item.food_id,
      raw_item.notes,
      raw_item.plan_date,
      array(
        select jsonb_array_elements_text(
          coalesce(raw_item.reason_labels, '[]'::jsonb)
        )
      ) as reason_labels,
      raw_item.sort_order,
      raw_item.why_this
    from jsonb_to_recordset(p_items) as raw_item(
      baby_plan_slot public.baby_plan_slot,
      display_name text,
      food_id uuid,
      notes text,
      plan_date date,
      reason_labels jsonb,
      sort_order int,
      why_this text
    )
  ) item
  where target.household_id = p_household_id
    and target.weekly_plan_id = p_weekly_plan_id
    and target.meal_profile_id = p_baby_profile_id
    and target.plan_date = item.plan_date
    and target.baby_plan_slot = item.baby_plan_slot
    and target.is_locked = false;

  insert into public.weekly_plan_items (
    baby_plan_slot,
    component_type,
    display_name,
    food_id,
    household_id,
    is_approved,
    is_locked,
    meal_profile_id,
    meal_type,
    notes,
    plan_date,
    reason_labels,
    recipe_id,
    scale_factor,
    sort_order,
    weekly_plan_id,
    why_this
  )
  select
    item.baby_plan_slot,
    'baby_food',
    item.display_name,
    item.food_id,
    p_household_id,
    false,
    false,
    p_baby_profile_id,
    'baby_meal',
    item.notes,
    item.plan_date,
    item.reason_labels,
    null,
    1,
    item.sort_order,
    p_weekly_plan_id,
    item.why_this
  from (
    select
      raw_item.baby_plan_slot,
      raw_item.display_name,
      raw_item.food_id,
      raw_item.notes,
      raw_item.plan_date,
      array(
        select jsonb_array_elements_text(
          coalesce(raw_item.reason_labels, '[]'::jsonb)
        )
      ) as reason_labels,
      raw_item.sort_order,
      raw_item.why_this
    from jsonb_to_recordset(p_items) as raw_item(
      baby_plan_slot public.baby_plan_slot,
      display_name text,
      food_id uuid,
      notes text,
      plan_date date,
      reason_labels jsonb,
      sort_order int,
      why_this text
    )
  ) item
  where not exists (
    select 1
    from public.weekly_plan_items existing
    where existing.household_id = p_household_id
      and existing.weekly_plan_id = p_weekly_plan_id
      and existing.meal_profile_id = p_baby_profile_id
      and existing.plan_date = item.plan_date
      and existing.baby_plan_slot = item.baby_plan_slot
  );
end;
$$;

revoke all on function public.replace_weekly_plan_baby_routine_items(
  uuid,
  uuid,
  uuid,
  jsonb
) from public;
grant execute on function public.replace_weekly_plan_baby_routine_items(
  uuid,
  uuid,
  uuid,
  jsonb
) to authenticated, service_role;
