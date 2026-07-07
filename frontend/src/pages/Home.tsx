import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import VendorCard from "../components/VendorCard";

export default function Home() {
  const { data: cats } = useAsync(() => api.categories(), []);
  const { data: vendors } = useAsync(() => api.vendors({ ordering: "name" }), []);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-rose-100 to-amber-50 p-8 sm:p-12">
        <h1 className="text-3xl font-semibold text-stone-800 sm:text-4xl">
          Plan your wedding in North Macedonia
        </h1>
        <p className="mt-3 max-w-2xl text-stone-600">
          Browse every kind of vendor, compare packages, and build a running
          budget as you go.
        </p>
        <Link
          to="/simulator"
          className="mt-6 inline-block rounded-lg bg-rose-600 px-5 py-2.5 font-medium text-white hover:bg-rose-700"
        >
          Start your budget
        </Link>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Browse by category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cats?.map((c) => (
            <Link
              key={c.id}
              to={`/category/${c.slug}`}
              className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 hover:border-rose-300 hover:shadow-sm"
            >
              <span className="text-2xl">{c.icon || "•"}</span>
              <span className="text-sm font-medium">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Featured vendors</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors?.results.slice(0, 6).map((v) => (
            <VendorCard key={v.id} vendor={v} />
          ))}
        </div>
      </section>
    </div>
  );
}
