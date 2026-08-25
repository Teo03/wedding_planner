import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import VendorCard from "../components/VendorCard";
import { useI18n, useLocalName } from "../i18n";
import Stars from "../components/Stars";
import PaginationControls from "../components/PaginationControls";
import Breadcrumbs from "../components/Breadcrumbs";

export default function CategoryBrowse() {
  const { slug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const localName = useLocalName();

  const { data: category } = useAsync(() => api.category(slug), [slug]);
  const { data: locations } = useAsync(() => api.locations(), []);

  const [sub, setSub] = useState<string | null>(searchParams.get("sub"));
  const [city, setCity] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("name");
  const [page, setPage] = useState(1);

  // The nav menu deep-links straight to a subcategory.
  useEffect(() => {
    setSub(searchParams.get("sub"));
    setPage(1);
  }, [searchParams, slug]);

  const categoryParam = sub ?? slug;

  const updateSub = (next: string | null) => {
    setSub(next);
    setPage(1);
  };

  const { data: vendors, loading } = useAsync(
    () =>
      api.vendors({
        category: categoryParam,
        city: city || undefined,
        max_price: maxPrice || undefined,
        min_rating: minRating || undefined,
        search: search || undefined,
        ordering,
        page,
      }),
    [categoryParam, city, maxPrice, minRating, search, ordering, page],
  );

  const pages = vendors ? Math.max(1, Math.ceil(vendors.count / 12)) : 1;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: t("nav.home"), to: "/" },
          { label: category ? localName(category) : "..." },
        ]}
      />

      <div>
        <h1 className="font-display text-3xl font-semibold">
          {category ? localName(category) : "..."}
        </h1>
        {category?.description && (
          <p className="mt-1 text-taupe-400">{category.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip active={sub === null} onClick={() => updateSub(null)}>
          {t("browse.all")}
        </Chip>
        {category?.children.map((child) => (
          <Chip
            key={child.id}
            active={sub === child.slug}
            onClick={() => updateSub(child.slug)}
          >
            {localName(child)}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-taupe-100 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">{t("browse.allCities")}</option>
          {locations?.map((location) => (
            <option key={location.id} value={location.slug}>
              {localName(location)}
            </option>
          ))}
        </select>

        <select
          value={minRating}
          onChange={(e) => {
            setMinRating(e.target.value);
            setPage(1);
          }}
          aria-label={t("browse.minRating")}
          className="rounded-md border border-taupe-100 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">{t("browse.anyRating")}</option>
          <option value="4.5">4.5+</option>
          <option value="4">4.0+</option>
          <option value="3.5">3.5+</option>
          <option value="3">3.0+</option>
        </select>

        <input
          value={maxPrice}
          onChange={(e) => {
            setMaxPrice(e.target.value.replace(/[^\d]/g, ""));
            setPage(1);
          }}
          inputMode="numeric"
          placeholder={`${t("browse.maxPrice")} €`}
          className="w-32 rounded-md border border-taupe-100 bg-white px-3 py-1.5 text-sm"
        />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("browse.search")}
          className="w-40 rounded-md border border-taupe-100 bg-white px-3 py-1.5 text-sm"
        />
        <select
          value={ordering}
          onChange={(e) => {
            setOrdering(e.target.value);
            setPage(1);
          }}
          aria-label={t("browse.sortBy")}
          className="ml-auto rounded-md border border-taupe-100 bg-white px-3 py-1.5 text-sm"
        >
          <option value="name">{t("browse.sortName")}</option>
          <option value="-rating">{t("browse.sortRatingDesc")}</option>
          <option value="rating">{t("browse.sortRatingAsc")}</option>
        </select>
      </div>

      {minRating && (
        <p className="flex items-center gap-1.5 text-xs text-taupe-400">
          <Stars value={Number(minRating)} size={12} />
          {t("browse.minRating")}: {minRating}+
        </p>
      )}

      {loading ? (
        <p className="py-10 text-center text-taupe-300">{t("browse.loading")}</p>
      ) : vendors && vendors.results.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.results.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
          <PaginationControls page={page} pages={pages} onPageChange={setPage} />
        </>
      ) : (
        <p className="py-10 text-center text-taupe-300">
          {t("browse.noResults")}
        </p>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-sm transition ${
        active
          ? "border-forest-500 bg-forest-500 text-cream-50"
          : "border-taupe-100 bg-white text-taupe-500 hover:border-olive-300"
      }`}
    >
      {children}
    </button>
  );
}
