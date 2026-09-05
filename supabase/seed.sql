-- =====================================================================
--  Seed local / staging — donnees synthetiques uniquement.
-- =====================================================================

insert into public.plans (code, name, max_published_vehicles, monthly_price_cents, is_default) values
  ('free',    'Decouverte', 1,    0,     true),
  ('starter', 'Starter',    5,    2900,  false),
  ('pro',     'Pro',        null, 7900,  false)
on conflict (code) do nothing;

insert into public.cities (name, slug, postal_code, department_code, department_name, region_name, latitude, longitude, population) values
  ('Paris',       'paris',       '75000', '75', 'Paris',              'Ile-de-France',              48.8566, 2.3522,  2145906),
  ('Marseille',   'marseille',   '13000', '13', 'Bouches-du-Rhone',   'Provence-Alpes-Cote d''Azur', 43.2965, 5.3698,  873076),
  ('Lyon',        'lyon',        '69000', '69', 'Rhone',              'Auvergne-Rhone-Alpes',       45.7640, 4.8357,  522969),
  ('Toulouse',    'toulouse',    '31000', '31', 'Haute-Garonne',      'Occitanie',                  43.6047, 1.4442,  504078),
  ('Nice',        'nice',        '06000', '06', 'Alpes-Maritimes',    'Provence-Alpes-Cote d''Azur', 43.7102, 7.2620,  348085),
  ('Nantes',      'nantes',      '44000', '44', 'Loire-Atlantique',   'Pays de la Loire',           47.2184, -1.5536, 323204),
  ('Montpellier', 'montpellier', '34000', '34', 'Herault',            'Occitanie',                  43.6108, 3.8767,  299096),
  ('Strasbourg',  'strasbourg',  '67000', '67', 'Bas-Rhin',           'Grand Est',                  48.5734, 7.7521,  291313),
  ('Bordeaux',    'bordeaux',    '33000', '33', 'Gironde',            'Nouvelle-Aquitaine',         44.8378, -0.5792, 260958),
  ('Lille',       'lille',       '59000', '59', 'Nord',               'Hauts-de-France',            50.6292, 3.0573,  236234)
on conflict (slug) do nothing;
