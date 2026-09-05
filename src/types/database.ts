/**
 * Types de la base de donnees.
 *
 * Ce fichier est ecrit a la main pour que le projet compile sans Supabase local.
 * Des que la base tourne, regenere-le fidelement avec :
 *   npm run db:types
 */

export type UserRole = "client" | "pro" | "admin";
export type PlanTier = "free" | "starter" | "pro";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unpaid";
export type AgencyStatus = "draft" | "pending" | "published" | "suspended";
export type VehicleStatus = "draft" | "published" | "archived";
export type VehicleCategory =
  | "citadine"
  | "compacte"
  | "berline"
  | "suv"
  | "break"
  | "monospace"
  | "cabriolet"
  | "coupe"
  | "utilitaire"
  | "minibus"
  | "prestige"
  | "sans_permis";
export type TransmissionType = "manuelle" | "automatique";
export type FuelType =
  | "essence"
  | "diesel"
  | "hybride"
  | "hybride_rechargeable"
  | "electrique"
  | "gpl";
export type LeadStatus = "nouveau" | "contacte" | "converti" | "perdu";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  city_id: string | null;
  marketing_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface City {
  id: string;
  name: string;
  slug: string;
  postal_code: string | null;
  department_code: string | null;
  department_name: string | null;
  region_name: string | null;
  country_code: string;
  latitude: number;
  longitude: number;
  population: number | null;
  created_at: string;
}

export interface Agency {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  legal_name: string | null;
  siret: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address_line: string | null;
  postal_code: string | null;
  city_id: string | null;
  city_name: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: Record<string, [string, string][]>;
  services: string[];
  status: AgencyStatus;
  is_verified: boolean;
  plan: PlanTier;
  rating_average: number;
  rating_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  agency_id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number | null;
  category: VehicleCategory;
  transmission: TransmissionType;
  fuel: FuelType;
  seats: number;
  doors: number;
  luggage: number;
  color: string | null;
  license_plate: string | null;
  price_per_day: number;
  price_per_week: number | null;
  price_per_month: number | null;
  deposit_amount: number | null;
  mileage_included_day: number | null;
  extra_km_price: number | null;
  min_driver_age: number | null;
  min_license_years: number | null;
  options: string[];
  description: string | null;
  images: string[];
  status: VehicleStatus;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  agency_id: string;
  vehicle_id: string | null;
  client_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  desired_start: string | null;
  desired_end: string | null;
  status: LeadStatus;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  agency_id: string;
  author_id: string;
  rating: number;
  comment: string | null;
  is_published: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  agency_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan: PlanTier;
  status: SubscriptionStatus;
  quantity: number;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Ligne renvoyee par la RPC `search_vehicles`. */
export interface VehicleSearchResult {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number | null;
  category: VehicleCategory;
  transmission: TransmissionType;
  fuel: FuelType;
  seats: number;
  price_per_day: number;
  price_per_week: number | null;
  images: string[];
  options: string[];
  is_featured: boolean;
  agency_id: string;
  agency_name: string;
  agency_slug: string;
  agency_is_verified: boolean;
  rating_average: number;
  rating_count: number;
  latitude: number | null;
  longitude: number | null;
  city_name: string | null;
  city_slug: string | null;
  distance_km: number | null;
  total_count: number;
}

/** Ligne renvoyee par la RPC `city_coverage`. */
export interface CityCoverage {
  city_id: string;
  city_name: string;
  city_slug: string;
  department_code: string | null;
  latitude: number;
  longitude: number;
  agency_count: number;
  vehicle_count: number;
  min_price: number | null;
}

type Row<T> = T;
type Insert<T, R extends keyof T = never> = Partial<Omit<T, R>> & Pick<T, R & keyof T>;

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Row<Profile>; Insert: Insert<Profile, "id">; Update: Partial<Profile> };
      cities: { Row: Row<City>; Insert: Insert<City, "name" | "slug" | "latitude" | "longitude">; Update: Partial<City> };
      agencies: { Row: Row<Agency>; Insert: Insert<Agency, "owner_id" | "name" | "slug">; Update: Partial<Agency> };
      vehicles: { Row: Row<Vehicle>; Insert: Insert<Vehicle, "agency_id" | "brand" | "model" | "price_per_day">; Update: Partial<Vehicle> };
      leads: { Row: Row<Lead>; Insert: Insert<Lead, "agency_id" | "first_name" | "email">; Update: Partial<Lead> };
      reviews: { Row: Row<Review>; Insert: Insert<Review, "agency_id" | "author_id" | "rating">; Update: Partial<Review> };
      subscriptions: { Row: Row<Subscription>; Insert: Insert<Subscription, "agency_id">; Update: Partial<Subscription> };
      favorites: {
        Row: { client_id: string; vehicle_id: string; created_at: string };
        Insert: { client_id: string; vehicle_id: string };
        Update: Partial<{ client_id: string; vehicle_id: string }>;
      };
      vehicle_unavailability: {
        Row: { id: string; vehicle_id: string; starts_on: string; ends_on: string; reason: string | null; created_at: string };
        Insert: { vehicle_id: string; starts_on: string; ends_on: string; reason?: string | null };
        Update: Partial<{ starts_on: string; ends_on: string; reason: string | null }>;
      };
    };
    Views: {
      vehicle_search_view: { Row: Omit<VehicleSearchResult, "distance_km" | "total_count"> };
    };
    Functions: {
      search_vehicles: { Args: Record<string, unknown>; Returns: VehicleSearchResult[] };
      city_coverage: { Args: { p_limit?: number }; Returns: CityCoverage[] };
      increment_vehicle_views: { Args: { p_vehicle_id: string }; Returns: void };
    };
    Enums: {
      user_role: UserRole;
      plan_tier: PlanTier;
      subscription_status: SubscriptionStatus;
      agency_status: AgencyStatus;
      vehicle_status: VehicleStatus;
      vehicle_category: VehicleCategory;
      transmission_type: TransmissionType;
      fuel_type: FuelType;
      lead_status: LeadStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
