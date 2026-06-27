alter table public.cooking_sessions
  add column substitutions text;

alter table public.recipe_reviews
  add column cooking_session_id uuid;

alter table public.recipe_reviews
  add constraint recipe_reviews_cooking_session_id_household_id_fkey
  foreign key (cooking_session_id, household_id)
  references public.cooking_sessions(id, household_id)
  on delete set null (cooking_session_id);

create unique index recipe_reviews_cooking_session_id_key
  on public.recipe_reviews (cooking_session_id)
  where cooking_session_id is not null;

create unique index cooking_sessions_one_active_direct_recipe_idx
  on public.cooking_sessions (household_id, recipe_id)
  where weekly_plan_item_id is null and status in ('active', 'paused');

create unique index cooking_sessions_one_active_planned_meal_idx
  on public.cooking_sessions (household_id, weekly_plan_item_id)
  where weekly_plan_item_id is not null and status in ('active', 'paused');

create or replace function public.prevent_terminal_cooking_session_parent_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.status in ('completed', 'abandoned') then
      raise exception 'Completed or abandoned cooking sessions cannot be changed.';
    end if;

    return old;
  end if;

  if old.status in ('completed', 'abandoned') then
    raise exception 'Completed or abandoned cooking sessions cannot be changed.';
  end if;

  return new;
end;
$$;

create trigger prevent_terminal_cooking_session_parent_update
  before update or delete on public.cooking_sessions
  for each row execute function public.prevent_terminal_cooking_session_parent_change();

create or replace function public.prevent_terminal_cooking_session_child_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_status public.cooking_session_status;
begin
  select status
    into parent_status
  from public.cooking_sessions
  where id = new.cooking_session_id
    and household_id = new.household_id;

  if parent_status in ('completed', 'abandoned') then
    raise exception 'Completed or abandoned cooking sessions cannot be changed.';
  end if;

  return new;
end;
$$;

create trigger prevent_terminal_cooking_session_ingredient_update
  before insert or update on public.cooking_session_ingredients
  for each row execute function public.prevent_terminal_cooking_session_child_update();

create trigger prevent_terminal_cooking_session_step_update
  before insert or update on public.cooking_session_steps
  for each row execute function public.prevent_terminal_cooking_session_child_update();

create trigger prevent_terminal_cooking_timer_update
  before insert or update on public.cooking_timers
  for each row execute function public.prevent_terminal_cooking_session_child_update();

create or replace function public.prevent_terminal_cooking_session_child_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_status public.cooking_session_status;
begin
  select status
    into parent_status
  from public.cooking_sessions
  where id = old.cooking_session_id
    and household_id = old.household_id;

  if parent_status in ('completed', 'abandoned') then
    raise exception 'Completed or abandoned cooking sessions cannot be changed.';
  end if;

  return old;
end;
$$;

create trigger prevent_terminal_cooking_session_ingredient_delete
  before delete on public.cooking_session_ingredients
  for each row execute function public.prevent_terminal_cooking_session_child_delete();

create trigger prevent_terminal_cooking_session_step_delete
  before delete on public.cooking_session_steps
  for each row execute function public.prevent_terminal_cooking_session_child_delete();

create trigger prevent_terminal_cooking_timer_delete
  before delete on public.cooking_timers
  for each row execute function public.prevent_terminal_cooking_session_child_delete();

create or replace function public.replace_recipe_steps(
  p_household_id uuid,
  p_recipe_id uuid,
  p_steps jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_household_member(p_household_id) then
    raise exception 'Household access is required.';
  end if;

  if not exists (
    select 1
    from public.recipes
    where id = p_recipe_id
      and household_id = p_household_id
      and archived_at is null
  ) then
    raise exception 'That recipe is no longer available.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_steps) as step
    where length(trim(coalesce(step->>'instruction', ''))) = 0
  ) then
    raise exception 'Every cooking step needs instruction text.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_steps) as step
    where nullif(step->>'id', '') is not null
      and not exists (
        select 1
        from public.recipe_steps existing
        where existing.id = (step->>'id')::uuid
          and existing.recipe_id = p_recipe_id
          and existing.household_id = p_household_id
      )
  ) then
    raise exception 'One cooking step is no longer available.';
  end if;

  update public.recipe_steps
  set sort_order = 100000 + sort_order
  where household_id = p_household_id
    and recipe_id = p_recipe_id;

  delete from public.recipe_steps existing
  where existing.household_id = p_household_id
    and existing.recipe_id = p_recipe_id
    and not exists (
      select 1
      from jsonb_array_elements(p_steps) as step
      where nullif(step->>'id', '') is not null
        and (step->>'id')::uuid = existing.id
    );

  update public.recipe_steps existing
  set
    instruction = trim(step_data.instruction),
    section_label = nullif(trim(coalesce(step_data.section_label, '')), ''),
    sort_order = step_data.sort_order
  from (
    select
      nullif(step->>'id', '')::uuid as id,
      step->>'instruction' as instruction,
      step->>'sectionLabel' as section_label,
      ordinality::integer - 1 as sort_order
    from jsonb_array_elements(p_steps) with ordinality as steps(step, ordinality)
    where nullif(step->>'id', '') is not null
  ) as step_data
  where existing.id = step_data.id
    and existing.household_id = p_household_id
    and existing.recipe_id = p_recipe_id;

  insert into public.recipe_steps (
    household_id,
    recipe_id,
    section_label,
    instruction,
    sort_order
  )
  select
    p_household_id,
    p_recipe_id,
    nullif(trim(coalesce(step->>'sectionLabel', '')), ''),
    trim(step->>'instruction'),
    ordinality::integer - 1
  from jsonb_array_elements(p_steps) with ordinality as steps(step, ordinality)
  where nullif(step->>'id', '') is null;

  update public.recipes
  set updated_at = now()
  where id = p_recipe_id
    and household_id = p_household_id;
end;
$$;

grant execute on function public.replace_recipe_steps(uuid, uuid, jsonb)
  to authenticated, service_role;
