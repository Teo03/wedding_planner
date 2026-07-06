import type {
  Category,
  Estimate,
  Location,
  Offer,
  Paginated,
  VendorDetail,
  VendorListItem,
} from "./types";

const BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  "http://localhost:8000/api";

type Params = Record<string, string | number | undefined | null>;

async function get<T>(path: string, params?: Params): Promise<T> {
  const url = new URL(BASE + path);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${path}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  categories: () => get<Category[]>("/categories/"),
  category: (slug: string) => get<Category>(`/categories/${slug}/`),
  locations: () => get<Location[]>("/locations/"),
  vendors: (params?: Params) =>
    get<Paginated<VendorListItem>>("/vendors/", params),
  vendor: (slug: string) => get<VendorDetail>(`/vendors/${slug}/`),
  offer: (id: number) => get<Offer>(`/offers/${id}/`),
  estimate: (offerId: number, guests?: number) =>
    get<Estimate>(`/offers/${offerId}/estimate/`, { guests }),
};
