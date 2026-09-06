-- Lot structurant (ADR-0011) : mode prefere par profil, personnalisation des espaces pro,
-- grille d'abonnement provisoire (essai 14 jours), en attendant Stripe (Phase 5).

-- Mode prefere (choisi a l'inscription, modifiable) : client ou pro. Jamais un role.
alter table public.profiles
  add column preferred_mode text not null default 'client'
  constraint profiles_preferred_mode check (preferred_mode in ('client', 'pro'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, preferred_mode)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 80), ''),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'last_name', ''), 80), ''),
    case when new.raw_user_meta_data ->> 'preferred_mode' = 'pro' then 'pro' else 'client' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Personnalisation : logo, banniere, bio, site, accent (choix ferme pour garder l'unite visuelle).
alter table public.organizations
  add column logo_path    text,
  add column banner_path  text,
  add column bio          text constraint organizations_bio_len check (bio is null or char_length(bio) <= 600),
  add column website      text constraint organizations_website_len check (website is null or char_length(website) <= 200),
  add column accent       text not null default 'red' constraint organizations_accent check (accent in ('red', 'gold', 'blue', 'green')),
  add column trial_ends_at timestamptz;

alter table public.agencies
  add column photo_path   text,
  add column description  text constraint agencies_description_len check (description is null or char_length(description) <= 600);

-- Grille provisoire : Starter 1-3, Pro 4-10, Business 11-30, Flotte sur devis. Essai 14 jours.
alter table public.plans
  add column min_vehicles integer not null default 1,
  add column is_quote     boolean not null default false,
  add column sort_order   integer not null default 0;

update public.plans set is_default = false, is_active = false where code = 'free';
insert into public.plans (code, name, min_vehicles, max_published_vehicles, monthly_price_cents, is_default, is_active, is_quote, sort_order) values
  ('starter',  'Starter',  1,  3,    2900,  true,  true, false, 1),
  ('pro',      'Pro',      4,  10,   7900,  false, true, false, 2),
  ('business', 'Business', 11, 30,   17900, false, true, false, 3),
  ('fleet',    'Flotte',   31, null, 0,     false, true, true,  4)
on conflict (code) do update set
  name = excluded.name,
  min_vehicles = excluded.min_vehicles,
  max_published_vehicles = excluded.max_published_vehicles,
  monthly_price_cents = excluded.monthly_price_cents,
  is_default = excluded.is_default,
  is_active = excluded.is_active,
  is_quote = excluded.is_quote,
  sort_order = excluded.sort_order;

-- Organisations existantes : Starter en essai depuis leur creation.
update public.organizations
set plan_code = 'starter', trial_ends_at = created_at + interval '14 days'
where plan_code = 'free';
