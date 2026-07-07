import { useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import VendorCard from "../components/VendorCard";

export default function CategoryBrowse() {
  const { slug = "" } = useParams();
  const { data: category } = useAsync(() => api.category(slug), [slug]);
  const { data: locations } = useAsync(() => api.locations(), []);

  const [sub, setSub] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [search, setSearch] = useState("");

  const categoryParam = sub ?? slug;

  const { data: vendors, loading } = useAsync(
    () =>
      api.vendors({
        category: categoryParam,
        city: city || undefined,
        max_price: maxPrice || undefined,
        search: search || undefined,
      }),
    [categoryParam, city, maxPrice, search],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {category?.icon} {category?.name ?? "Category"}
        </h1>
        {category?.description && (
          <p className="text-stone-500">{category.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip active={sub === null} onClick={() => setSub(null)}>
          All
        </Chip>
        {category?.children.map((c) => (
          <Chip
            key={c.id}
            active={sub === c.slug}
            onClick={() => setSub(c.slug)}
          >
            {c.name}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded border border-stone-300 px-3 py-1.5 text-sm"
        >
          <option value="">All cities</option>
          {locations?.map((l) => (
            <option key={l.id} value={l.slug}>
              {l.name}
            </option>
          ))}
        </select>
        <input
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          type="number"
          placeholder="Max price €"
          className="w-32 rounded border border-stone-300 px-3 py-1.5 text-sm"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-40 rounded border border-stone-300 px-3 py-1.5 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-stone-400">Loading…</p>
      ) : vendors && vendors.results.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.results.map((v) => (
            <VendorCard key={v.id} vendor={v} />
          ))}
        </div>
      ) : (
        <p className="text-stone-400">No vendors match these filters.</p>
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
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm ${
        active
          ? "border-rose-600 bg-rose-600 text-white"
          : "border-stone-300 bg-white text-stone-600 hover:border-rose-300"
      }`}
    >
      {children}
    </button>
  );
}
