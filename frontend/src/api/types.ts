export type Currency = "EUR" | "MKD";
export type PriceType =
  | "fixed"
  | "per_guest"
  | "tiered_per_guest"
  | "per_hour"
  | "starting_at";

export interface Region {
  id: number;
  name: string;
  name_mk: string;
  slug: string;
  description: string;
}

export interface Location {
  id: number;
  name: string;
  name_mk: string;
  slug: string;
  region: Region | null;
  latitude: string | null;
  longitude: string | null;
}

export type Audience = "couple" | "bride" | "groom";

export interface CategorySummary {
  id: number;
  name: string;
  name_mk: string;
  slug: string;
  layout_hint: "venue" | "service";
  icon: string;
  audience: Audience;
  display_order: number;
}

export interface Category extends CategorySummary {
  parent: number | null;
  description: string;
  children: CategorySummary[];
}

export interface PriceTier {
  id: number;
  guests_from: number;
  guests_to: number | null;
  price_per_guest: string;
}

export interface Offer {
  id: number;
  vendor: number;
  name: string;
  name_mk: string;
  description: string;
  description_mk: string;
  categories: CategorySummary[];
  price_currency: Currency;
  price_type: PriceType;
  price_amount: string | null;
  price_per_guest: string | null;
  min_guest_count: number | null;
  min_capacity: number | null;
  max_capacity: number | null;
  attributes: Record<string, unknown>;
  is_active: boolean;
  display_order: number;
  price_tiers: PriceTier[];
}

export interface MediaItem {
  id: number;
  media_type: "image" | "video";
  url: string;
  caption: string;
  credit: string;
  credit_url: string;
  display_order: number;
  is_cover_photo: boolean;
  offer: number | null;
}

export interface Contact {
  phone: string;
  viber: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
  facebook: string;
}

export interface VendorListItem {
  id: number;
  name: string;
  slug: string;
  business_type: string;
  status: string;
  location: Location | null;
  categories: CategorySummary[];
  cover_photo: string | null;
  from_price: string | null;
  /** Site reviews once any exist, otherwise the Google snapshot. */
  rating: number | null;
  rating_source: "site" | "google" | null;
  site_rating: number | null;
  site_review_count: number;
  google_rating: number | null;
  google_review_count: number | null;
}

export interface VendorDetail extends VendorListItem {
  description: string;
  founded_year: number | null;
  address: string;
  offers: Offer[];
  media: MediaItem[];
  contact: Contact | null;
  attributes: Record<string, unknown>;
}

export interface Estimate {
  offer_id: number;
  currency: Currency;
  price_type: PriceType;
  guest_dependent: boolean;
  requested_guests: number | null;
  effective_guests: number | null;
  min_guest_applied: boolean;
  unit_price: string | null;
  total: string | null;
  note: string;
  /** Key + values for the note, so it can be rendered in the reader's language. */
  note_code: string;
  note_params: Record<string, number | string>;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface RatingSummary {
  site_rating: number | null;
  site_review_count: number;
  google_rating: number | null;
  google_review_count: number | null;
  rating: number | null;
  rating_source: "site" | "google" | null;
  histogram: Record<string, number>;
}

export interface Review {
  id: number;
  rating: number;
  title: string;
  body: string;
  author: string;
  author_id: number;
  created_at: string;
  updated_at: string;
}

export interface ChatVendor {
  name: string;
  slug: string;
  city: string | null;
  categories: string[];
  rating: number | null;
  rating_source: "site" | "google" | null;
  from_eur: number | null;
  phone: string;
}

export interface ChatPlanLine extends ChatVendor {
  category_slug: string;
  allowance_eur: number;
  estimated_eur: number;
  over_allowance: boolean;
}

export interface ChatPlan {
  budget_eur: number;
  guests: number;
  total_eur: number;
  remaining_eur: number;
  lines: ChatPlanLine[];
}

export interface ChatReply {
  answer: string;
  /** "model" when a language model wrote the prose, "catalog" when the
   *  deterministic fallback did. Both are grounded in the same rows. */
  source: "model" | "catalog";
  vendors: ChatVendor[];
  plan: ChatPlan | null;
}

export interface ReviewList extends Paginated<Review> {
  summary: RatingSummary;
  current_user_review: Review | null;
}

export interface AuthResponse {
  user: User;
}
