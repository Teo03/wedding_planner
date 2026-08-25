import type { Category, Location } from "../api/types";
import { useI18n, useLocalName } from "../i18n";
import Stars from "./Stars";

export interface FilterState {
  category: string;
  audience: string;
  city: string;
  maxPrice: string;
  minRating: string;
  search: string;
  ordering: string;
}

export const EMPTY_FILTERS: FilterState = {
  category: "",
  audience: "",
  city: "",
  maxPrice: "",
  minRating: "",
  search: "",
  ordering: "name",
};

/**
 * The browse filter bar: category chips (plus the Bride/Groom cuts that span
 * categories), then city / price / rating / sort.
 */
export default function VendorFilters({
  categories,
  locations,
  value,
  onChange,
}: {
  categories: Category[] | null;
  locations: Location[] | null;
  value: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const { t } = useI18n();
  const localName = useLocalName();
  const set = <K extends keyof FilterState>(key: K, next: FilterState[K]) =>
    onChange({ ...value, [key]: next });

  const isAll = !value.category && !value.audience;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <Chip
          active={isAll}
          onClick={() => onChange({ ...value, category: "", audience: "" })}
        >
          {t("browse.all")}
        </Chip>
        <Chip
          active={value.audience === "bride"}
          onClick={() =>
            onChange({ ...value, audience: "bride", category: "" })
          }
        >
          {t("browse.bride")}
        </Chip>
        <Chip
          active={value.audience === "groom"}
          onClick={() =>
            onChange({ ...value, audience: "groom", category: "" })
          }
        >
          {t("browse.groom")}
        </Chip>
        <span className="mx-1 w-px self-stretch bg-taupe-100" aria-hidden="true" />
        {categories?.map((category) => (
          <Chip
            key={category.id}
            active={value.category === category.slug}
            onClick={() =>
              onChange({ ...value, category: category.slug, audience: "" })
            }
          >
            {localName(category)}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={value.city}
          onChange={(e) => set("city", e.target.value)}
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
          value={value.minRating}
          onChange={(e) => set("minRating", e.target.value)}
          className="rounded-md border border-taupe-100 bg-white px-3 py-1.5 text-sm"
          aria-label={t("browse.minRating")}
        >
          <option value="">{t("browse.anyRating")}</option>
          <option value="4.5">4.5+</option>
          <option value="4">4.0+</option>
          <option value="3.5">3.5+</option>
          <option value="3">3.0+</option>
        </select>

        <input
          value={value.maxPrice}
          onChange={(e) => set("maxPrice", e.target.value.replace(/[^\d]/g, ""))}
          inputMode="numeric"
          placeholder={`${t("browse.maxPrice")} €`}
          className="w-32 rounded-md border border-taupe-100 bg-white px-3 py-1.5 text-sm"
        />

        <input
          value={value.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder={t("browse.search")}
          className="w-44 rounded-md border border-taupe-100 bg-white px-3 py-1.5 text-sm"
        />

        <select
          value={value.ordering}
          onChange={(e) => set("ordering", e.target.value)}
          className="ml-auto rounded-md border border-taupe-100 bg-white px-3 py-1.5 text-sm"
          aria-label={t("browse.sortBy")}
        >
          <option value="name">{t("browse.sortName")}</option>
          <option value="-rating">{t("browse.sortRatingDesc")}</option>
          <option value="rating">{t("browse.sortRatingAsc")}</option>
        </select>
      </div>

      {value.minRating && (
        <p className="flex items-center gap-1.5 text-xs text-taupe-400">
          <Stars value={Number(value.minRating)} size={12} />
          {t("browse.minRating")}: {value.minRating}+
          <button
            onClick={() => set("minRating", "")}
            className="ml-1 underline hover:text-forest-500"
          >
            {t("browse.clearFilters")}
          </button>
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
