alter table public.recipes
  add column source_url text,
  add column source_title text;

alter table public.recipes
  add constraint recipes_source_url_http_check
  check (
    source_url is null
    or source_url ~* '^https?://'
  );
