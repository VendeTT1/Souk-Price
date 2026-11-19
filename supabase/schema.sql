-- Run this in the Supabase SQL editor. Safe to re-run: it upgrades an existing database in place.

-- =====================================================================
-- 1. Table
-- =====================================================================
create table if not exists public.prices (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  -- location
  region        text not null,
  city          text not null,
  neighborhood  text not null check (char_length(neighborhood) between 1 and 80),

  -- where it was bought
  market_type   text not null check (market_type in ('souk','street','supermarket','shop')),
  market_name   text not null check (char_length(market_name) between 1 and 80),

  -- what was bought (ids come from src/data/catalog.js)
  category      text not null check (category in ('vegetables','fruits','meat','fish','poultry','eggs')),
  item          text not null check (char_length(item) between 1 and 60),
  price         numeric(8,2) not null check (price > 0 and price < 10000),
  unit          text not null check (unit in ('kg','unit')),

  -- 1 = bad, 2 = neutral, 3 = good (price/quality ratio)
  rating        smallint not null check (rating between 1 and 3),
  comment       text check (comment is null or char_length(comment) <= 500)
);

-- Data-quality flags. Visitors cannot set them (see grants below, and the trigger forces them).
--   hidden  : you removed the row by hand (moderation). Not shown anywhere.
--   suspect : the trigger found the price far from the usual range. Still listed in search,
--             but ignored by averages / medians.
alter table public.prices
  add column if not exists hidden  boolean not null default false,
  add column if not exists suspect boolean not null default false;

create index if not exists prices_item_idx    on public.prices (item, unit);
create index if not exists prices_city_idx    on public.prices (city);
create index if not exists prices_created_idx on public.prices (created_at desc);
create index if not exists prices_stats_idx   on public.prices (item, unit, created_at) where not hidden and not suspect;

-- =====================================================================
-- 2. Abuse protection (rate limit + duplicate guard + plausibility check)
-- =====================================================================
-- The "private" schema is not exposed by the API: only the trigger below can read it.
create schema if not exists private;

create table if not exists private.settings (
  key   text primary key,
  value text not null
);
insert into private.settings (key, value)
values ('ip_salt', md5(random()::text || clock_timestamp()::text || gen_random_uuid()::text))
on conflict (key) do nothing;

-- Only a salted hash of the visitor's IP is kept, for 2 days, to count recent submissions.
create table if not exists private.submission_log (
  ip_hash      text not null,
  item         text,
  market_name  text,
  price        numeric,
  created_at   timestamptz not null default now()
);
create index if not exists submission_log_ip_idx on private.submission_log (ip_hash, created_at desc);

revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;

create or replace function public.prices_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- tune these limits here, then re-run this file
  c_hour_limit constant int := 15;   -- max submissions per visitor per hour
  c_day_limit  constant int := 60;   -- max submissions per visitor per day

  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  v_ip      text;
  v_hash    text;
  v_hour    int;
  v_day     int;
  v_n       int;
  v_median  numeric;
begin
  -- visitors can never choose the flags
  new.hidden  := false;
  new.suspect := false;

  v_ip := nullif(trim(split_part(
            coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-forwarded-for', ''), ',', 1)), '');

  -- no IP known (SQL editor, seed script): skip the rate limit instead of blocking everybody
  -- (admin approvals set app.skip_limits for their own transaction, see section 6)
  if v_ip is not null and coalesce(current_setting('app.skip_limits', true), '') <> 'on' then
    v_hash := md5(v_ip || (select value from private.settings where key = 'ip_salt'));

    select count(*) filter (where created_at > now() - interval '1 hour'), count(*)
      into v_hour, v_day
      from private.submission_log
     where ip_hash = v_hash and created_at > now() - interval '1 day';

    if v_hour >= c_hour_limit or v_day >= c_day_limit then
      raise exception 'rate_limit';
    end if;

    if exists (
      select 1 from private.submission_log
       where ip_hash = v_hash and item = new.item and market_name = new.market_name
         and price = new.price and created_at > now() - interval '1 hour'
    ) then
      raise exception 'duplicate';
    end if;

    insert into private.submission_log (ip_hash, item, market_name, price)
    values (v_hash, new.item, new.market_name, new.price);

    if random() < 0.02 then  -- cheap housekeeping
      delete from private.submission_log where created_at < now() - interval '2 days';
    end if;
  end if;

  -- plausibility: with at least 5 known prices, 5x above / below the median is suspect
  select count(*), percentile_cont(0.5) within group (order by price)
    into v_n, v_median
    from public.prices
   where item = new.item and unit = new.unit
     and not hidden and not suspect
     and created_at > now() - interval '90 days';

  if v_n >= 5 and (new.price > v_median * 5 or new.price < v_median / 5) then
    new.suspect := true;
  end if;

  return new;
end;
$$;

drop trigger if exists prices_before_insert on public.prices;
create trigger prices_before_insert
  before insert on public.prices
  for each row execute function public.prices_before_insert();

-- =====================================================================
-- 3. Read models
-- =====================================================================
-- Dashboard: typical price (median) and average per item/unit over the last 30 days.
-- Hidden and suspect rows are ignored. The "enough entries" threshold is applied in the app.
drop view if exists public.price_summary;
create view public.price_summary as
select
  category,
  item,
  unit,
  count(*)::int                                                      as entries,
  round(avg(price), 2)                                               as avg_price,
  round((percentile_cont(0.5) within group (order by price))::numeric, 2) as median_price,
  min(price)                                                         as min_price,
  max(price)                                                         as max_price,
  round(avg(rating)::numeric, 2)                                     as avg_rating,
  count(distinct city)::int                                          as cities
from public.prices
where created_at > now() - interval '30 days'
  and not hidden and not suspect
group by category, item, unit;

-- Median + average for the current search filters, over ALL matches (the UI only downloads one
-- page at a time). Returns the unit with the most entries so kg and per-unit prices never mix.
-- NULL parameter = filter not applied.
drop function if exists public.search_stats(text, text, text, text, text, smallint);
create function public.search_stats(
  p_item text default null,
  p_region text default null,
  p_city text default null,
  p_neighborhood text default null,
  p_market text default null,
  p_rating smallint default null
)
returns table (unit text, avg_price numeric, median_price numeric, entries int)
language sql
stable
security invoker
as $$
  select p.unit,
         round(avg(p.price), 2),
         round((percentile_cont(0.5) within group (order by p.price))::numeric, 2),
         count(*)::int
  from public.prices p
  where not p.hidden and not p.suspect
    and (p_item is null         or p.item = p_item)
    and (p_region is null       or p.region = p_region)
    and (p_city is null         or p.city = p_city)
    and (p_neighborhood is null or p.neighborhood ilike '%' || replace(replace(replace(p_neighborhood, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    and (p_market is null       or p.market_name  ilike '%' || replace(replace(replace(p_market, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    and (p_rating is null       or p.rating = p_rating)
  group by p.unit
  order by count(*) desc
  limit 1;
$$;

-- =====================================================================
-- 4. Access: no accounts for the POC. Visitors can read and insert, nothing else.
-- =====================================================================
alter table public.prices enable row level security;

drop policy if exists "public read"   on public.prices;
drop policy if exists "public insert" on public.prices;

create policy "public read"   on public.prices for select using (not hidden);
create policy "public insert" on public.prices for insert with check (true);

-- Insert is allowed on the form's columns only: id, created_at, hidden and suspect stay out of reach.
revoke insert on public.prices from anon, authenticated;
grant select on public.prices to anon, authenticated;
grant insert (region, city, neighborhood, market_type, market_name, category, item, price, unit, rating, comment)
  on public.prices to anon, authenticated;

grant select on public.price_summary to anon, authenticated;
grant execute on function public.search_stats(text, text, text, text, text, smallint) to anon, authenticated;

-- =====================================================================
-- 5. Review queue: submissions that contain a name we do not know yet
-- =====================================================================
-- When a visitor types a city, neighborhood or product that is not in the app's lists, the WHOLE form is
-- stored here as JSON instead of in public.prices. Visitors can only insert; nobody can read it through
-- the API. You review it in the dashboard, fix typos, add the new place/product to the app's data files,
-- and turn the approved rows into clean INSERTs with scripts/pending-to-sql.mjs (see README).
create table if not exists public.pending_submissions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text,
  payload     jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 4000)
);
create index if not exists pending_submissions_status_idx on public.pending_submissions (status, created_at);

create or replace function public.pending_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_hour_limit constant int := 15;   -- shares the counters of public.prices
  c_day_limit  constant int := 60;

  v_p       jsonb := new.payload;
  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  v_ip      text;
  v_hash    text;
  v_hour    int;
  v_day     int;
  v_item    text;
begin
  new.status      := 'pending';
  new.review_note := null;

  -- shape checks: reject garbage early (the app always sends this shape)
  if jsonb_typeof(v_p -> 'custom') is distinct from 'object' or v_p -> 'custom' = '{}'::jsonb then
    raise exception 'invalid_payload';
  end if;
  if coalesce(v_p ->> 'price', '') !~ '^[0-9]{1,4}(\.[0-9]{1,2})?$'
     or (v_p ->> 'price')::numeric <= 0
     or coalesce(v_p ->> 'unit', '') not in ('kg', 'unit')
     or coalesce(v_p ->> 'rating', '') not in ('1', '2', '3')
     or coalesce(v_p ->> 'market_type', '') not in ('souk', 'street', 'supermarket', 'shop')
     or coalesce(v_p ->> 'category', '') not in ('vegetables', 'fruits', 'meat', 'fish', 'poultry', 'eggs')
     or char_length(coalesce(v_p ->> 'neighborhood', '')) not between 1 and 80
     or char_length(coalesce(v_p ->> 'market_name', '')) not between 1 and 80
     or char_length(coalesce(v_p ->> 'comment', '')) > 500
     or char_length(coalesce(v_p -> 'custom' ->> 'city', '')) > 80
     or char_length(coalesce(v_p -> 'custom' ->> 'item', '')) > 60
     or char_length(coalesce(v_p -> 'custom' ->> 'neighborhood', '')) > 80 then
    raise exception 'invalid_payload';
  end if;

  v_ip := nullif(trim(split_part(
            coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-forwarded-for', ''), ',', 1)), '');
  if v_ip is not null then
    v_hash := md5(v_ip || (select value from private.settings where key = 'ip_salt'));
    v_item := coalesce(v_p ->> 'item', v_p -> 'custom' ->> 'item');

    select count(*) filter (where created_at > now() - interval '1 hour'), count(*)
      into v_hour, v_day
      from private.submission_log
     where ip_hash = v_hash and created_at > now() - interval '1 day';
    if v_hour >= c_hour_limit or v_day >= c_day_limit then
      raise exception 'rate_limit';
    end if;

    if exists (
      select 1 from private.submission_log
       where ip_hash = v_hash and item = v_item and market_name = v_p ->> 'market_name'
         and price = (v_p ->> 'price')::numeric and created_at > now() - interval '1 hour'
    ) then
      raise exception 'duplicate';
    end if;

    insert into private.submission_log (ip_hash, item, market_name, price)
    values (v_hash, v_item, v_p ->> 'market_name', (v_p ->> 'price')::numeric);
  end if;

  return new;
end;
$$;

drop trigger if exists pending_before_insert on public.pending_submissions;
create trigger pending_before_insert
  before insert on public.pending_submissions
  for each row execute function public.pending_before_insert();

alter table public.pending_submissions enable row level security;
drop policy if exists "public insert pending" on public.pending_submissions;
create policy "public insert pending" on public.pending_submissions for insert with check (true);
-- no select / update / delete policy and no grant: visitors can write here but never read it
revoke all on public.pending_submissions from anon, authenticated;
grant insert (payload) on public.pending_submissions to anon, authenticated;

-- =====================================================================
-- 6. Admin review: approve / reject pending submissions from the app (#/admin)
-- =====================================================================
-- Who is an admin: a Supabase Auth user whose id is listed in private.admins. After creating your user
-- (Authentication > Users > Add user), make yourself admin once, in the SQL editor:
--   insert into private.admins (user_id) select id from auth.users where email = 'you@example.com';
create table if not exists private.admins (
  user_id uuid primary key,
  note    text
);
revoke all on private.admins from public, anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admins where user_id = (select auth.uid()));
$$;

-- Cities and products approved from the dashboard. The app loads them at start-up and adds them to
-- the built-in lists. Visitors can read them; only admin_review() below can write.
create table if not exists public.extra_items (
  id         text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 60),
  category   text not null check (category in ('vegetables','fruits','meat','fish','poultry','eggs')),
  unit       text not null check (unit in ('kg','unit')),
  name_en    text not null check (char_length(name_en) between 1 and 80),
  name_fr    text not null check (char_length(name_fr) between 1 and 80),
  name_ar    text not null check (char_length(name_ar) between 1 and 80),
  created_at timestamptz not null default now()
);
create table if not exists public.extra_cities (
  id         text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 60),
  region     text not null check (char_length(region) between 1 and 60),
  province   text not null check (char_length(province) between 1 and 60),
  name_en    text not null check (char_length(name_en) between 1 and 80),
  name_fr    text not null check (char_length(name_fr) between 1 and 80),
  name_ar    text not null check (char_length(name_ar) between 1 and 80),
  created_at timestamptz not null default now()
);
alter table public.extra_items  enable row level security;
alter table public.extra_cities enable row level security;
drop policy if exists "public read" on public.extra_items;
drop policy if exists "public read" on public.extra_cities;
create policy "public read" on public.extra_items  for select using (true);
create policy "public read" on public.extra_cities for select using (true);
revoke all on public.extra_items, public.extra_cities from anon, authenticated;
grant select on public.extra_items, public.extra_cities to anon, authenticated;

-- Is the signed-in user an admin? (the app uses it to decide whether to show the dashboard)
create or replace function public.am_i_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.is_admin(); $$;

create or replace function public.admin_list_pending()
returns setof public.pending_submissions
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'not_admin'; end if;
  return query select * from public.pending_submissions where status = 'pending' order by created_at;
end;
$$;

-- One call = one decision, all or nothing:
--   reject  -> marks the row rejected
--   approve -> (optionally creates the new city / product), inserts the price, marks the row approved
-- p_city / p_item: an existing id chosen by the admin (a typo of a known place or product).
-- p_new_city / p_new_item: {id, region, province, name_en, name_fr, name_ar} / {id, category, unit, name_*}.
create or replace function public.admin_review(
  p_id uuid,
  p_action text,
  p_note text default null,
  p_city text default null,
  p_region text default null,
  p_item text default null,
  p_category text default null,
  p_unit text default null,
  p_neighborhood text default null,
  p_new_city jsonb default null,
  p_new_item jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row          public.pending_submissions;
  v_p            jsonb;
  v_city         text;
  v_region       text;
  v_item         text;
  v_category     text;
  v_unit         text;
  v_neighborhood text;
begin
  if not private.is_admin() then raise exception 'not_admin'; end if;

  select * into v_row from public.pending_submissions where id = p_id and status = 'pending' for update;
  if not found then raise exception 'not_found'; end if;

  if p_action = 'reject' then
    update public.pending_submissions set status = 'rejected', review_note = left(p_note, 500) where id = p_id;
    return;
  end if;
  if p_action is distinct from 'approve' then raise exception 'bad_action'; end if;

  v_p            := v_row.payload;
  v_city         := coalesce(p_city, v_p ->> 'city');
  v_region       := coalesce(p_region, v_p ->> 'region');
  v_item         := coalesce(p_item, v_p ->> 'item');
  v_category     := coalesce(p_category, v_p ->> 'category');
  v_unit         := coalesce(p_unit, v_p ->> 'unit');
  v_neighborhood := coalesce(nullif(trim(p_neighborhood), ''), v_p ->> 'neighborhood');

  if p_new_city is not null then
    insert into public.extra_cities (id, region, province, name_en, name_fr, name_ar)
    values (p_new_city ->> 'id', p_new_city ->> 'region', p_new_city ->> 'province', p_new_city ->> 'name_en',
            coalesce(nullif(p_new_city ->> 'name_fr', ''), p_new_city ->> 'name_en'),
            coalesce(nullif(p_new_city ->> 'name_ar', ''), p_new_city ->> 'name_en'));
    v_city   := p_new_city ->> 'id';
    v_region := p_new_city ->> 'region';
  end if;

  if p_new_item is not null then
    insert into public.extra_items (id, category, unit, name_en, name_fr, name_ar)
    values (p_new_item ->> 'id', p_new_item ->> 'category', p_new_item ->> 'unit', p_new_item ->> 'name_en',
            coalesce(nullif(p_new_item ->> 'name_fr', ''), p_new_item ->> 'name_en'),
            coalesce(nullif(p_new_item ->> 'name_ar', ''), p_new_item ->> 'name_en'));
    v_item     := p_new_item ->> 'id';
    v_category := p_new_item ->> 'category';
  end if;

  if v_city is null or v_item is null then raise exception 'unresolved'; end if;

  -- the admin is not a visitor: no rate limit / duplicate guard (the plausibility check still runs)
  perform set_config('app.skip_limits', 'on', true);

  insert into public.prices
    (created_at, region, city, neighborhood, market_type, market_name, category, item, price, unit, rating, comment)
  values
    (v_row.created_at, v_region, v_city, v_neighborhood, v_p ->> 'market_type', v_p ->> 'market_name',
     v_category, v_item, (v_p ->> 'price')::numeric, v_unit, (v_p ->> 'rating')::smallint,
     nullif(v_p ->> 'comment', ''));

  update public.pending_submissions set status = 'approved', review_note = left(p_note, 500) where id = p_id;
end;
$$;

revoke all on function public.am_i_admin() from public, anon;
revoke all on function public.admin_list_pending() from public, anon;
revoke all on function public.admin_review(uuid, text, text, text, text, text, text, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.am_i_admin() to authenticated;
grant execute on function public.admin_list_pending() to authenticated;
grant execute on function public.admin_review(uuid, text, text, text, text, text, text, text, text, jsonb, jsonb) to authenticated;

-- =====================================================================
-- Moderation cheat sheet (run in the SQL editor, never from the app)
--   hide a row:    update public.prices set hidden = true  where id = '<uuid>';
--   restore it:    update public.prices set hidden = false where id = '<uuid>';
--   review flags:  select id, item, price, unit, market_name, created_at
--                    from public.prices where suspect and not hidden order by created_at desc;
--   un-flag one:   update public.prices set suspect = false where id = '<uuid>';
--   review queue:  select id, created_at, payload from public.pending_submissions
--                    where status = 'pending' order by created_at;
--   export it:     select jsonb_pretty(jsonb_agg(to_jsonb(p) order by created_at))
--                    from public.pending_submissions p where status = 'pending';
--                  (then follow the README: scripts/pending-to-sql.mjs)
-- =====================================================================
