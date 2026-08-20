import { useState } from "react";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import VendorCard from "../components/VendorCard";
import VendorFilters, {
  EMPTY_FILTERS,
  type FilterState,
} from "../components/VendorFilters";
import { useI18n } from "../i18n";

/** Browse the whole catalog, filtered by category, audience, city, price and rating. */
export default function Vendors() {
  const { t } = useI18n();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const { data: categories } = useAsync(() => api.categories(), []);
  const { data: locations } = useAsync(() => api.locations(), []);

  const { data: vendors, loading } = useAsync(
    () =>
      api.vendors({
        category: filters.category || undefined,
        audience: filters.audience || undefined,
        city: filters.city || undefined,
        max_price: filters.maxPrice || undefined,
        min_rating: filters.minRating || undefined,
        search: filters.search || undefined,
        ordering: filters.ordering,
        page,
      }),
    [
      filters.category,
      filters.audience,
      filters.city,
      filters.maxPrice,
      filters.minRating,
      filters.search,
      filters.ordering,
      page,
    ],
  );

  const applyFilters = (next: FilterState) => {
    setFilters(next);
    setPage(1); // a changed filter invalidates the current page number
  };

  const pages = vendors ? Math.max(1, Math.ceil(vendors.count / 12)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">
          {t("browse.title")}
        </h1>
        {vendors && (
          <span className="text-sm text-taupe-400">
            {t("browse.resultCount", { count: vendors.count })}
          </span>
        )}
      </div>

      <VendorFilters
        categories={categories}
        locations={locations}
        value={filters}
        onChange={applyFilters}
      />

      {loading ? (
        <p className="py-12 text-center text-taupe-300">{t("browse.loading")}</p>
      ) : vendors && vendors.results.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.results.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-taupe-100 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
              >
                {t("browse.prev")}
              </button>
              <span className="text-sm text-taupe-400">
                {t("browse.page", { page, pages })}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="rounded-md border border-taupe-100 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
              >
                {t("browse.next")}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="py-12 text-center">
          <p className="text-taupe-300">{t("browse.noResults")}</p>
          <button
            onClick={() => applyFilters(EMPTY_FILTERS)}
            className="mt-3 rounded-md border border-taupe-100 bg-white px-4 py-2 text-sm hover:border-olive-300"
          >
            {t("browse.clearFilters")}
          </button>
        </div>
      )}
    </div>
  );
}
