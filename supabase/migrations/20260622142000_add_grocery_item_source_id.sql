alter table public.grocery_item_sources
  add column source_id uuid;

update public.grocery_item_sources
set source_id = weekly_plan_item_id
where source_id is null
  and source_type in ('meal_generated', 'baby_item')
  and weekly_plan_item_id is not null;
