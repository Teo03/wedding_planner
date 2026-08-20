import type {
  AuthResponse,
  Category,
  RatingSummary,
  Review,
  ReviewList,
  Estimate,
  Location,
  Offer,
  Paginated,
  VendorDetail,
  VendorListItem,
  User,
} from "./types";

const BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  "http://localhost:8000/api";

type Params = Record<string, string | number | undefined | null>;

async function get<T>(path: string, params?: Params): Promise<T> {
  // Resolve against the page origin so a relative BASE (e.g. "/api", used when
  // the SPA is served same-origin with the API) is valid. Absolute bases
  // (e.g. the localhost dev default) ignore the second arg.
  const origin =
    typeof window !== "undefined" ? window.location.origin : undefined;
  const url = new URL(BASE + path, origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return request<T>(url.toString(), {}, path);
}

async function del<T>(path: string): Promise<T> {
  return request<T>(BASE + path, { method: "DELETE" }, path);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(
    BASE + path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    path,
    !path.startsWith("/auth/"),
  );
}

async function request<T>(
  url: string,
  init: RequestInit,
  path: string,
  retryAuth = true,
): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  if (res.status === 401 && retryAuth) {
    try {
      await refreshAccess();
      return request<T>(url, init, path, false);
    } catch {
      await logout();
    }
  }
  if (!res.ok) {
    const detail = await readError(res);
    throw new Error(detail || `${res.status} ${res.statusText} for ${path}`);
  }
  return res.json() as Promise<T>;
}

async function refreshAccess() {
  const res = await fetch(BASE + "/auth/refresh/", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const detail = await readError(res);
    throw new Error(detail || "Could not refresh session.");
  }
  return res.json() as Promise<{ detail: string }>;
}

async function logout() {
  await fetch(BASE + "/auth/logout/", {
    method: "POST",
    credentials: "include",
  });
}

async function readError(res: Response) {
  try {
    const body = (await res.json()) as Record<string, unknown>;
    if (typeof body.detail === "string") return body.detail;
    if (typeof body.username === "object") return "Username is already taken.";
    if (typeof body.email === "object") return "Email is already registered.";
    if (typeof body.password === "object") return "Password does not meet requirements.";
  } catch {
    // Fall through to the generic HTTP error.
  }
  return "";
}

export const api = {
  login: (username: string, password: string) =>
    post<AuthResponse>("/auth/login/", { username, password }),
  register: (data: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => post<AuthResponse>("/auth/register/", data),
  refresh: refreshAccess,
  logout,
  me: () => get<User>("/auth/me/"),
  categories: () => get<Category[]>("/categories/"),
  category: (slug: string) => get<Category>(`/categories/${slug}/`),
  locations: () => get<Location[]>("/locations/"),
  vendors: (params?: Params) =>
    get<Paginated<VendorListItem>>("/vendors/", params),
  vendor: (slug: string) => get<VendorDetail>(`/vendors/${slug}/`),
  offer: (id: number) => get<Offer>(`/offers/${id}/`),
  estimate: (offerId: number, guests?: number) =>
    get<Estimate>(`/offers/${offerId}/estimate/`, { guests }),
  reviews: (vendorSlug: string) =>
    get<ReviewList>(`/vendors/${vendorSlug}/reviews/`),
  postReview: (
    vendorSlug: string,
    data: { rating: number; title?: string; body?: string },
  ) =>
    post<{ review: Review; summary: RatingSummary }>(
      `/vendors/${vendorSlug}/reviews/`,
      data,
    ),
  deleteReview: (vendorSlug: string) =>
    del<{ summary: RatingSummary }>(`/vendors/${vendorSlug}/reviews/`),
};
