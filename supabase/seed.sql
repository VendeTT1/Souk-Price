-- Optional test data so the dashboard and search have something to show.
-- Run AFTER schema.sql. Delete later with:  delete from public.prices where comment = '[seed]';

insert into public.prices (region, city, neighborhood, market_type, market_name, category, item, price, unit, rating, comment, created_at)
select
  p.region, p.city, p.neighborhood, p.market_type, p.market_name,
  i.category, i.item,
  round((i.base * (0.8 + random() * 0.4))::numeric, 2),
  i.unit,
  (1 + floor(random() * 3))::smallint,
  '[seed]',
  now() - (random() * interval '25 days')
from (values
  ('casablanca-settat',  'casablanca', 'Maarif',          'supermarket', 'Marjane'),
  ('casablanca-settat',  'casablanca', 'Derb Sultan',     'souk',        'Marché Derb Sultan'),
  ('rabat-sale-kenitra', 'rabat',      'Agdal',           'supermarket', 'Carrefour'),
  ('marrakech-safi',     'marrakech',  'Gueliz',          'street',      'Vendeur ambulant'),
  ('fes-meknes',         'fes',        'Ville Nouvelle',  'souk',        'Marché Fès'),
  ('souss-massa',        'agadir',     'Talborjt',        'souk',        'Souk Talborjt')
) as p(region, city, neighborhood, market_type, market_name)
cross join (values
  ('vegetables', 'tomato',        6::numeric,  'kg'),
  ('vegetables', 'potato',        5::numeric,  'kg'),
  ('vegetables', 'onion',         4::numeric,  'kg'),
  ('fruits',     'orange',        7::numeric,  'kg'),
  ('fruits',     'banana',        14::numeric, 'kg'),
  ('poultry',    'chicken-whole', 28::numeric, 'kg'),
  ('fish',       'sardines',      15::numeric, 'kg'),
  ('eggs',       'eggs',          1.4::numeric,'unit')
) as i(category, item, base, unit);
