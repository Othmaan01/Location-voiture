-- =====================================================================
--  Donnees de demonstration
--  Executees automatiquement par `supabase db reset` (environnement local).
--  Comptes de test :
--    pro@rentmap.test    / Demo1234!   (loueur professionnel)
--    client@rentmap.test / Demo1234!   (particulier)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Referentiel des villes
-- ---------------------------------------------------------------------
insert into public.cities (name, slug, postal_code, department_code, department_name, region_name, latitude, longitude, population) values
  ('Paris',                'paris',                '75000', '75',  'Paris',                  'Ile-de-France',              48.8566,   2.3522, 2133111),
  ('Marseille',            'marseille',            '13000', '13',  'Bouches-du-Rhone',       'Provence-Alpes-Cote d Azur', 43.2965,   5.3698,  870731),
  ('Lyon',                 'lyon',                 '69000', '69',  'Rhone',                  'Auvergne-Rhone-Alpes',       45.7640,   4.8357,  522969),
  ('Toulouse',             'toulouse',             '31000', '31',  'Haute-Garonne',          'Occitanie',                  43.6047,   1.4442,  493465),
  ('Nice',                 'nice',                 '06000', '06',  'Alpes-Maritimes',        'Provence-Alpes-Cote d Azur', 43.7102,   7.2620,  342637),
  ('Nantes',               'nantes',               '44000', '44',  'Loire-Atlantique',       'Pays de la Loire',           47.2184,  -1.5536,  320732),
  ('Montpellier',          'montpellier',          '34000', '34',  'Herault',                'Occitanie',                  43.6108,   3.8767,  295542),
  ('Strasbourg',           'strasbourg',           '67000', '67',  'Bas-Rhin',               'Grand Est',                  48.5734,   7.7521,  287228),
  ('Bordeaux',             'bordeaux',             '33000', '33',  'Gironde',                'Nouvelle-Aquitaine',         44.8378,  -0.5792,  259809),
  ('Lille',                'lille',                '59000', '59',  'Nord',                   'Hauts-de-France',            50.6292,   3.0573,  236234),
  ('Rennes',               'rennes',               '35000', '35',  'Ille-et-Vilaine',        'Bretagne',                   48.1173,  -1.6778,  222485),
  ('Reims',                'reims',                '51100', '51',  'Marne',                  'Grand Est',                  49.2583,   4.0317,  182460),
  ('Toulon',               'toulon',               '83000', '83',  'Var',                    'Provence-Alpes-Cote d Azur', 43.1242,   5.9280,  176198),
  ('Saint-Etienne',        'saint-etienne',        '42000', '42',  'Loire',                  'Auvergne-Rhone-Alpes',       45.4397,   4.3872,  174652),
  ('Le Havre',             'le-havre',             '76600', '76',  'Seine-Maritime',         'Normandie',                  49.4944,   0.1079,  165830),
  ('Grenoble',             'grenoble',             '38000', '38',  'Isere',                  'Auvergne-Rhone-Alpes',       45.1885,   5.7245,  158454),
  ('Dijon',                'dijon',                '21000', '21',  'Cote-d Or',              'Bourgogne-Franche-Comte',    47.3220,   5.0415,  158002),
  ('Angers',               'angers',               '49000', '49',  'Maine-et-Loire',         'Pays de la Loire',           47.4784,  -0.5632,  155850),
  ('Villeurbanne',         'villeurbanne',         '69100', '69',  'Rhone',                  'Auvergne-Rhone-Alpes',       45.7719,   4.8902,  152212),
  ('Nimes',                'nimes',                '30000', '30',  'Gard',                   'Occitanie',                  43.8367,   4.3601,  148561),
  ('Clermont-Ferrand',     'clermont-ferrand',     '63000', '63',  'Puy-de-Dome',            'Auvergne-Rhone-Alpes',       45.7772,   3.0870,  147865),
  ('Le Mans',              'le-mans',              '72000', '72',  'Sarthe',                 'Pays de la Loire',           48.0061,   0.1996,  145112),
  ('Aix-en-Provence',      'aix-en-provence',      '13100', '13',  'Bouches-du-Rhone',       'Provence-Alpes-Cote d Azur', 43.5297,   5.4474,  143097),
  ('Brest',                'brest',                '29200', '29',  'Finistere',              'Bretagne',                   48.3904,  -4.4861,  139926),
  ('Tours',                'tours',                '37000', '37',  'Indre-et-Loire',         'Centre-Val de Loire',        47.3941,   0.6848,  136463),
  ('Amiens',               'amiens',               '80000', '80',  'Somme',                  'Hauts-de-France',            49.8941,   2.2958,  134057),
  ('Limoges',              'limoges',              '87000', '87',  'Haute-Vienne',           'Nouvelle-Aquitaine',         45.8336,   1.2611,  130876),
  ('Annecy',               'annecy',               '74000', '74',  'Haute-Savoie',           'Auvergne-Rhone-Alpes',       45.8992,   6.1294,  130721),
  ('Perpignan',            'perpignan',            '66000', '66',  'Pyrenees-Orientales',    'Occitanie',                  42.6887,   2.8948,  119656),
  ('Boulogne-Billancourt', 'boulogne-billancourt', '92100', '92',  'Hauts-de-Seine',         'Ile-de-France',              48.8352,   2.2409,  121334),
  ('Metz',                 'metz',                 '57000', '57',  'Moselle',                'Grand Est',                  49.1193,   6.1757,  116429),
  ('Besancon',             'besancon',             '25000', '25',  'Doubs',                  'Bourgogne-Franche-Comte',    47.2378,   6.0241,  116775),
  ('Orleans',              'orleans',              '45000', '45',  'Loiret',                 'Centre-Val de Loire',        47.9029,   1.9092,  116269),
  ('Rouen',                'rouen',                '76000', '76',  'Seine-Maritime',         'Normandie',                  49.4432,   1.0999,  112321),
  ('Mulhouse',             'mulhouse',             '68100', '68',  'Haut-Rhin',              'Grand Est',                  47.7508,   7.3359,  108312),
  ('Caen',                 'caen',                 '14000', '14',  'Calvados',               'Normandie',                  49.1829,  -0.3707,  105512),
  ('Nancy',                'nancy',                '54000', '54',  'Meurthe-et-Moselle',     'Grand Est',                  48.6921,   6.1844,  104885),
  ('Pau',                  'pau',                  '64000', '64',  'Pyrenees-Atlantiques',   'Nouvelle-Aquitaine',         43.2951,  -0.3708,   77130),
  ('La Rochelle',          'la-rochelle',          '17000', '17',  'Charente-Maritime',      'Nouvelle-Aquitaine',         46.1591,  -1.1520,   77205),
  ('Cannes',               'cannes',               '06400', '06',  'Alpes-Maritimes',        'Provence-Alpes-Cote d Azur', 43.5528,   7.0174,   74545),
  ('Bayonne',              'bayonne',              '64100', '64',  'Pyrenees-Atlantiques',   'Nouvelle-Aquitaine',         43.4929,  -1.4748,   51894),
  ('Biarritz',             'biarritz',             '64200', '64',  'Pyrenees-Atlantiques',   'Nouvelle-Aquitaine',         43.4832,  -1.5586,   25404),
  ('Chambery',             'chambery',             '73000', '73',  'Savoie',                 'Auvergne-Rhone-Alpes',       45.5646,   5.9178,   59490),
  ('Ajaccio',              'ajaccio',              '20000', '2A',  'Corse-du-Sud',           'Corse',                      41.9192,   8.7386,   71361),
  ('Fort-de-France',       'fort-de-france',       '97200', '972', 'Martinique',             'Martinique',                 14.6161, -61.0588,   76512),
  ('Saint-Denis',          'saint-denis-reunion',  '97400', '974', 'La Reunion',             'La Reunion',                -20.8789,  55.4481,  153810)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Comptes de demonstration + agences + vehicules
-- ---------------------------------------------------------------------
do $$
declare
  pro_id     uuid := '11111111-1111-4111-8111-111111111111';
  client_id  uuid := '22222222-2222-4222-8222-222222222222';
  agency_id  uuid;
  v_city_id  uuid;
  rec        record;
begin
  -- --- comptes auth -------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  values
    ('00000000-0000-0000-0000-000000000000', pro_id, 'authenticated', 'authenticated',
     'pro@rentmap.test', extensions.crypt('Demo1234!', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"pro","full_name":"Antoine Mercier"}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', client_id, 'authenticated', 'authenticated',
     'client@rentmap.test', extensions.crypt('Demo1234!', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"client","full_name":"Julie Bernard"}', now(), now())
  on conflict (id) do nothing;

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), pro_id, pro_id::text,
     format('{"sub":"%s","email":"pro@rentmap.test","email_verified":true}', pro_id)::jsonb,
     'email', now(), now(), now()),
    (gen_random_uuid(), client_id, client_id::text,
     format('{"sub":"%s","email":"client@rentmap.test","email_verified":true}', client_id)::jsonb,
     'email', now(), now(), now())
  on conflict do nothing;

  -- Le trigger handle_new_user a cree les profils ; on force le role au cas ou.
  update public.profiles set role = 'pro',    full_name = 'Antoine Mercier' where id = pro_id;
  update public.profiles set role = 'client', full_name = 'Julie Bernard'   where id = client_id;

  -- --- agences ------------------------------------------------------
  for rec in
    select * from (values
      ('Mercier Location',      'mercier-location',      'paris',     '18 rue de Berri',            '75008', 48.8720,  2.3050, 'pro',     true,  'Agence familiale depuis 1994, specialisee dans la citadine et la berline pour les deplacements professionnels a Paris.', array['livraison','gare','24_7','jeune_conducteur']),
      ('Rhone Auto Prestige',   'rhone-auto-prestige',   'lyon',      '42 cours Lafayette',         '69003', 45.7640,  4.8560, 'pro',     true,  'Vehicules recents et haut de gamme a Lyon Part-Dieu. Livraison en gare et aeroport Saint-Exupery.', array['aeroport','gare','livraison']),
      ('Sud Location Auto',     'sud-location-auto',     'marseille', '9 boulevard Rabatau',        '13008', 43.2760,  5.3900, 'starter', true,  'Location de vehicules economiques et utilitaires sur Marseille et sa peripherie.', array['utilitaire','sans_caution']),
      ('Atlantique Cars',       'atlantique-cars',       'bordeaux',  '25 quai de Bacalan',         '33300', 44.8580, -0.5580, 'starter', false, 'Le partenaire des sejours en Gironde : citadines, breaks et cabriolets.', array['gare','livraison']),
      ('Riviera Rent',          'riviera-rent',          'nice',      '3 promenade des Anglais',    '06000', 43.6950,  7.2650, 'pro',     true,  'Cabriolets et vehicules de prestige sur la Cote d Azur. Prise en charge a l aeroport Nice Cote d Azur.', array['aeroport','livraison','prestige']),
      ('Alpes Mobilite',        'alpes-mobilite',        'annecy',    '12 avenue de Geneve',        '74000', 45.9070,  6.1200, 'free',    false, 'SUV et 4x4 equipes pour la montagne, au depart d Annecy.', array['montagne','equipement_neige'])
    ) as t(name, slug, city_slug, address_line, postal_code, lat, lng, plan, verified, description, services)
  loop
    select id into v_city_id from public.cities where slug = rec.city_slug;

    insert into public.agencies (
      owner_id, name, slug, description, email, phone, website,
      address_line, postal_code, city_id, city_name, latitude, longitude,
      services, status, is_verified, plan, opening_hours
    )
    values (
      pro_id, rec.name, rec.slug, rec.description,
      rec.slug || '@rentmap.test', '+33 4 00 00 00 00', 'https://exemple.fr',
      rec.address_line, rec.postal_code, v_city_id,
      (select name from public.cities where id = v_city_id),
      rec.lat, rec.lng, rec.services, 'published', rec.verified, rec.plan::public.plan_tier,
      '{"mon":[["08:30","19:00"]],"tue":[["08:30","19:00"]],"wed":[["08:30","19:00"]],"thu":[["08:30","19:00"]],"fri":[["08:30","19:00"]],"sat":[["09:00","17:00"]],"sun":[]}'::jsonb
    )
    on conflict (slug) do nothing;
  end loop;

  -- --- vehicules ----------------------------------------------------
  for rec in
    select * from (values
      ('mercier-location',    'Renault',    'Clio V',        'Evolution',      2023, 'citadine',   'manuelle',   'essence',              5, 39.00, 235.00, 690.00,  600.00, true),
      ('mercier-location',    'Peugeot',    '308',           'Allure',         2024, 'compacte',   'automatique','hybride',              5, 59.00, 350.00, 990.00,  900.00, false),
      ('mercier-location',    'Tesla',      'Model 3',       'Propulsion',     2024, 'berline',    'automatique','electrique',           5, 89.00, 540.00, 1490.00, 1200.00, true),
      ('mercier-location',    'Citroen',    'Berlingo',      'Van',            2022, 'utilitaire', 'manuelle',   'diesel',               3, 55.00, 330.00, 890.00,  800.00, false),
      ('rhone-auto-prestige', 'BMW',        'Serie 3',       '320d M Sport',   2024, 'berline',    'automatique','diesel',               5, 99.00, 590.00, 1690.00, 1500.00, true),
      ('rhone-auto-prestige', 'Audi',       'Q5',            'S line',         2023, 'suv',        'automatique','hybride_rechargeable', 5,119.00, 700.00, 1990.00, 1800.00, true),
      ('rhone-auto-prestige', 'Volkswagen', 'Golf',          'Life',           2023, 'compacte',   'manuelle',   'essence',              5, 49.00, 295.00, 850.00,  700.00, false),
      ('rhone-auto-prestige', 'Mercedes',   'Classe V',      'Avantgarde',     2023, 'minibus',    'automatique','diesel',               8,149.00, 890.00, 2490.00, 2000.00, false),
      ('sud-location-auto',   'Dacia',      'Sandero',       'Essential',      2023, 'citadine',   'manuelle',   'essence',              5, 29.00, 175.00, 520.00,  500.00, false),
      ('sud-location-auto',   'Fiat',       '500',           'Dolcevita',      2022, 'citadine',   'manuelle',   'essence',              4, 34.00, 205.00, 590.00,  500.00, false),
      ('sud-location-auto',   'Renault',    'Trafic',        'L2H1',           2021, 'utilitaire', 'manuelle',   'diesel',               3, 69.00, 415.00, 1150.00, 1000.00, false),
      ('atlantique-cars',     'Peugeot',    '208',           'Style',          2024, 'citadine',   'automatique','essence',              5, 42.00, 250.00, 720.00,  600.00, false),
      ('atlantique-cars',     'Skoda',      'Octavia Combi', 'Business',       2023, 'break',      'automatique','diesel',               5, 64.00, 385.00, 1090.00, 900.00, false),
      ('atlantique-cars',     'MINI',       'Cooper Cabrio', 'Chili',          2022, 'cabriolet',  'automatique','essence',              4, 79.00, 470.00, 1290.00, 1200.00, false),
      ('riviera-rent',        'Porsche',    '718 Boxster',   'PDK',            2023, 'cabriolet',  'automatique','essence',              2,289.00,1750.00, 4900.00, 5000.00, true),
      ('riviera-rent',        'Range Rover','Evoque',        'R-Dynamic',      2024, 'suv',        'automatique','hybride_rechargeable', 5,159.00, 950.00, 2690.00, 2500.00, true),
      ('riviera-rent',        'Fiat',       '500e',          'La Prima',       2024, 'citadine',   'automatique','electrique',           4, 54.00, 325.00, 920.00,  700.00, false),
      ('alpes-mobilite',      'Dacia',      'Duster',        '4x4 Journey',    2023, 'suv',        'manuelle',   'diesel',               5, 69.00, 415.00, 1150.00, 900.00, false)
    ) as t(agency_slug, brand, model, version, year, category, transmission, fuel, seats,
           price_day, price_week, price_month, deposit, featured)
  loop
    select id into agency_id from public.agencies where slug = rec.agency_slug;
    if agency_id is null then continue; end if;

    insert into public.vehicles (
      agency_id, brand, model, version, year, category, transmission, fuel, seats,
      price_per_day, price_per_week, price_per_month, deposit_amount,
      mileage_included_day, extra_km_price, options, description, status, is_featured
    )
    values (
      agency_id, rec.brand, rec.model, rec.version, rec.year,
      rec.category::public.vehicle_category,
      rec.transmission::public.transmission_type,
      rec.fuel::public.fuel_type,
      rec.seats, rec.price_day, rec.price_week, rec.price_month, rec.deposit,
      200, 0.35,
      array['clim','bluetooth','regulateur'],
      format('%s %s %s en excellent etat, entretien constructeur a jour. Kilometrage inclus 200 km/jour.', rec.brand, rec.model, coalesce(rec.version, '')),
      'published',
      rec.featured
    );
  end loop;

  -- --- abonnements --------------------------------------------------
  insert into public.subscriptions (agency_id, plan, status, current_period_end)
  select a.id, a.plan, 'active', now() + interval '30 days'
  from public.agencies a
  on conflict (agency_id) do nothing;

  -- --- quelques avis ------------------------------------------------
  insert into public.reviews (agency_id, author_id, rating, comment)
  select a.id, client_id, 5, 'Prise en charge rapide, vehicule impeccable. Je recommande.'
  from public.agencies a where a.slug = 'mercier-location'
  on conflict do nothing;

  -- --- une demande de contact ---------------------------------------
  insert into public.leads (agency_id, vehicle_id, client_id, first_name, last_name, email, phone, message, desired_start, desired_end)
  select a.id, v.id, client_id, 'Julie', 'Bernard', 'client@rentmap.test', '+33 6 12 34 56 78',
         'Bonjour, la Clio est-elle disponible le week-end prochain ?',
         current_date + 7, current_date + 10
  from public.agencies a
  join public.vehicles v on v.agency_id = a.id
  where a.slug = 'mercier-location' and v.model = 'Clio V'
  limit 1;
end $$;
