-- =====================================================================
--  Regles metier : quotas d'abonnement, vue de recherche, RPC de recherche
-- =====================================================================

-- ---------------------------------------------------------------------
-- Quotas par palier d'abonnement
--   free    : 1 vehicule publie, pas de mise en avant
--   starter : 5 vehicules publies
--   pro     : illimite + mise en avant
-- Ces valeurs sont la source de verite serveur ; le front les reflete
-- dans src/lib/plans.ts.
-- ---------------------------------------------------------------------

create or replace function public.plan_vehicle_limit(p_plan public.plan_tier)
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'free'    then 1
    when 'starter' then 5
    when 'pro'     then null   -- null = illimite
  end;
$$;

create or replace function public.plan_allows_featured(p_plan public.plan_tier)
returns boolean
language sql
immutable
as $$
  select p_plan = 'pro';
$$;

-- Empeche de publier plus de vehicules que le palier ne l'autorise.
create or replace function public.enforce_vehicle_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  agency_plan public.plan_tier;
  max_allowed integer;
  published_count integer;
begin
  if new.status <> 'published' then
    return new;
  end if;

  -- Rien a verifier si le vehicule etait deja publie.
  if tg_op = 'UPDATE' and old.status = 'published' then
    if new.is_featured and not old.is_featured then
      select plan into agency_plan from public.agencies where id = new.agency_id;
      if not public.plan_allows_featured(agency_plan) then
        raise exception 'La mise en avant est reservee au palier Pro.'
          using errcode = 'check_violation';
      end if;
    end if;
    return new;
  end if;

  select plan into agency_plan from public.agencies where id = new.agency_id;
  max_allowed := public.plan_vehicle_limit(agency_plan);

  if new.is_featured and not public.plan_allows_featured(agency_plan) then
    raise exception 'La mise en avant est reservee au palier Pro.'
      using errcode = 'check_violation';
  end if;

  if max_allowed is null then
    return new;
  end if;

  select count(*) into published_count
  from public.vehicles
  where agency_id = new.agency_id
    and status = 'published'
    and id <> new.id;

  if published_count >= max_allowed then
    raise exception 'Palier % : % vehicule(s) publie(s) maximum. Passez au palier superieur pour en ajouter.',
      agency_plan, max_allowed
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger vehicles_enforce_quota
  before insert or update on public.vehicles
  for each row execute function public.enforce_vehicle_quota();

-- Si une agence retombe au palier free, on depublie l'excedent
-- (les fiches ne sont pas supprimees, elles repassent en brouillon).
create or replace function public.demote_vehicles_over_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_allowed integer := public.plan_vehicle_limit(new.plan);
begin
  if new.plan = old.plan or max_allowed is null then
    return new;
  end if;

  update public.vehicles v
  set status = 'draft', is_featured = false
  where v.agency_id = new.id
    and v.status = 'published'
    and v.id not in (
      select id from public.vehicles
      where agency_id = new.id and status = 'published'
      order by is_featured desc, updated_at desc
      limit max_allowed
    );

  if not public.plan_allows_featured(new.plan) then
    update public.vehicles set is_featured = false where agency_id = new.id and is_featured;
  end if;

  return new;
end;
$$;

create trigger agencies_demote_vehicles
  after update of plan on public.agencies
  for each row execute function public.demote_vehicles_over_quota();

-- ---------------------------------------------------------------------
-- Vue de recherche : tout ce qu'il faut pour une carte et une liste,
-- sans jointure cote client.
-- ---------------------------------------------------------------------

create or replace view public.vehicle_search_view
with (security_invoker = true)
as
select
  v.id,
  v.brand,
  v.model,
  v.version,
  v.year,
  v.category,
  v.transmission,
  v.fuel,
  v.seats,
  v.doors,
  v.luggage,
  v.price_per_day,
  v.price_per_week,
  v.price_per_month,
  v.deposit_amount,
  v.options,
  v.images,
  v.description,
  v.is_featured,
  v.created_at,
  a.id            as agency_id,
  a.name          as agency_name,
  a.slug          as agency_slug,
  a.logo_url      as agency_logo_url,
  a.phone         as agency_phone,
  a.is_verified   as agency_is_verified,
  a.plan          as agency_plan,
  a.rating_average,
  a.rating_count,
  a.latitude,
  a.longitude,
  a.address_line,
  a.postal_code,
  coalesce(c.name, a.city_name) as city_name,
  c.slug          as city_slug,
  c.department_code
from public.vehicles v
join public.agencies a on a.id = v.agency_id
left join public.cities c on c.id = a.city_id
where v.status = 'published'
  and a.status = 'published';

comment on view public.vehicle_search_view is 'Vue denormalisee des vehicules publies : source unique de la recherche, de la carte et des pages ville.';

-- ---------------------------------------------------------------------
-- RPC de recherche geographique + filtres
-- ---------------------------------------------------------------------

create or replace function public.search_vehicles(
  p_lat            double precision default null,
  p_lng            double precision default null,
  p_radius_km      double precision default 30,
  p_query          text default null,
  p_city_slug      text default null,
  p_categories     text[] default null,
  p_transmissions  text[] default null,
  p_fuels          text[] default null,
  p_min_price      numeric default null,
  p_max_price      numeric default null,
  p_min_seats      smallint default null,
  p_options        text[] default null,
  p_sort           text default 'pertinence',
  p_limit          integer default 24,
  p_offset         integer default 0
)
returns table (
  id                uuid,
  brand             text,
  model             text,
  version           text,
  year              integer,
  category          public.vehicle_category,
  transmission      public.transmission_type,
  fuel              public.fuel_type,
  seats             smallint,
  price_per_day     numeric,
  price_per_week    numeric,
  images            text[],
  options           text[],
  is_featured       boolean,
  agency_id         uuid,
  agency_name       text,
  agency_slug       text,
  agency_is_verified boolean,
  rating_average    numeric,
  rating_count      integer,
  latitude          double precision,
  longitude         double precision,
  city_name         text,
  city_slug         text,
  distance_km       double precision,
  total_count       bigint
)
language sql
stable
set search_path = public, extensions
as $$
with params as (
  select
    case
      when p_lat is not null and p_lng is not null
      then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    end as origin,
    nullif(btrim(coalesce(p_query, '')), '') as q
),
filtered as (
  select
    s.*,
    case
      when params.origin is not null and s.latitude is not null
      then extensions.st_distance(
             params.origin,
             extensions.st_setsrid(extensions.st_makepoint(s.longitude, s.latitude), 4326)::extensions.geography
           ) / 1000.0
    end as distance_km
  from public.vehicle_search_view s
  cross join params
  where
    (params.origin is null or s.latitude is null or extensions.st_dwithin(
        params.origin,
        extensions.st_setsrid(extensions.st_makepoint(s.longitude, s.latitude), 4326)::extensions.geography,
        coalesce(p_radius_km, 30) * 1000
     ))
    and (p_city_slug is null or s.city_slug = p_city_slug)
    and (params.q is null or (
          extensions.unaccent(lower(s.brand || ' ' || s.model || ' ' || coalesce(s.version, '') || ' ' || s.agency_name))
          like '%' || extensions.unaccent(lower(params.q)) || '%'
        ))
    and (p_categories is null or cardinality(p_categories) = 0 or s.category::text = any (p_categories))
    and (p_transmissions is null or cardinality(p_transmissions) = 0 or s.transmission::text = any (p_transmissions))
    and (p_fuels is null or cardinality(p_fuels) = 0 or s.fuel::text = any (p_fuels))
    and (p_min_price is null or s.price_per_day >= p_min_price)
    and (p_max_price is null or s.price_per_day <= p_max_price)
    and (p_min_seats is null or s.seats >= p_min_seats)
    and (p_options is null or cardinality(p_options) = 0 or s.options @> p_options)
)
select
  f.id, f.brand, f.model, f.version, f.year, f.category, f.transmission, f.fuel,
  f.seats, f.price_per_day, f.price_per_week, f.images, f.options, f.is_featured,
  f.agency_id, f.agency_name, f.agency_slug, f.agency_is_verified,
  f.rating_average, f.rating_count, f.latitude, f.longitude, f.city_name, f.city_slug,
  round(f.distance_km::numeric, 1)::double precision as distance_km,
  count(*) over () as total_count
from filtered f
order by
  case when p_sort = 'prix_asc'  then f.price_per_day end asc nulls last,
  case when p_sort = 'prix_desc' then f.price_per_day end desc nulls last,
  case when p_sort = 'distance'  then f.distance_km end asc nulls last,
  case when p_sort = 'recent'    then f.created_at end desc nulls last,
  -- pertinence : les mises en avant (palier Pro) d'abord, puis la proximite
  f.is_featured desc,
  f.distance_km asc nulls last,
  f.rating_average desc,
  f.created_at desc
limit greatest(coalesce(p_limit, 24), 1)
offset greatest(coalesce(p_offset, 0), 0);
$$;

comment on function public.search_vehicles is 'Recherche unifiee : rayon geographique, texte libre, filtres et tri. Renvoie total_count pour la pagination.';

-- ---------------------------------------------------------------------
-- Agregat par ville : alimente la carte de couverture et les pages SEO.
-- ---------------------------------------------------------------------

create or replace function public.city_coverage(p_limit integer default 100)
returns table (
  city_id         uuid,
  city_name       text,
  city_slug       text,
  department_code text,
  latitude        double precision,
  longitude       double precision,
  agency_count    bigint,
  vehicle_count   bigint,
  min_price       numeric
)
language sql
stable
set search_path = public
as $$
  select
    c.id, c.name, c.slug, c.department_code, c.latitude, c.longitude,
    count(distinct a.id) as agency_count,
    count(v.id)          as vehicle_count,
    min(v.price_per_day) as min_price
  from public.cities c
  left join public.agencies a on a.city_id = c.id and a.status = 'published'
  left join public.vehicles v on v.agency_id = a.id and v.status = 'published'
  group by c.id
  order by vehicle_count desc, c.population desc nulls last
  limit greatest(coalesce(p_limit, 100), 1);
$$;

-- Compteur de vues, appelable sans authentification.
create or replace function public.increment_vehicle_views(p_vehicle_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.vehicles set view_count = view_count + 1 where id = p_vehicle_id;
$$;

grant execute on function public.search_vehicles to anon, authenticated;
grant execute on function public.city_coverage to anon, authenticated;
grant execute on function public.increment_vehicle_views to anon, authenticated;
grant execute on function public.plan_vehicle_limit to anon, authenticated;
