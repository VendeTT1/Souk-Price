-- Run this in the Supabase SQL editor.

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

create index if not exists prices_item_idx on public.prices (item, unit);
create index if not exists prices_city_idx on public.prices (city);
create index if not exists prices_created_idx on public.prices (created_at desc);

-- Dashboard summary: average per item/unit over the last 30 days.
-- The "enough entries" threshold is applied in the app (VITE_MIN_ENTRIES).
create or replace view public.price_summary as
select
  category,
  item,
  unit,
  count(*)::int                    as entries,
  round(avg(price), 2)             as avg_price,
  min(price)                       as min_price,
  max(price)                       as max_price,
  round(avg(rating)::numeric, 2)   as avg_rating,
  count(distinct city)::int        as cities
from public.prices
where created_at > now() - interval '30 days'
group by category, item, unit;

-- No accounts for the POC: anonymous visitors can read and insert, nothing else.
alter table public.prices enable row level security;

drop policy if exists "public read"   on public.prices;
drop policy if exists "public insert" on public.prices;

create policy "public read"   on public.prices for select using (true);
create policy "public insert" on public.prices for insert with check (true);

grant select on public.price_summary to anon;
grant select, insert on public.prices to anon;
