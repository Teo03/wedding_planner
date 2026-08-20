import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import VendorCard from "../components/VendorCard";
import { useI18n, useLocalName } from "../i18n";

export default function Home() {
  const { t } = useI18n();
  const localName = useLocalName();
  const { data: categories } = useAsync(() => api.categories(), []);
  const { data: vendors } = useAsync(
    () => api.vendors({ ordering: "-rating", rated: "1" }),
    [],
  );

  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-gradient-to-br from-blush-100 via-cream-100 to-olive-100 p-8 sm:p-14">
        <h1 className="font-display max-w-2xl text-4xl leading-tight font-semibold text-forest-600 sm:text-5xl">
          {t("tagline")}
        </h1>
        <p className="mt-4 max-w-2xl text-taupe-500">{t("home.heroLead")}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/vendors"
            className="rounded-lg bg-forest-500 px-5 py-2.5 font-medium text-cream-50 hover:bg-forest-600"
          >
            {t("nav.vendors")}
          </Link>
          <Link
            to="/plan"
            className="rounded-lg border border-forest-500 px-5 py-2.5 font-medium text-forest-600 hover:bg-white"
          >
            {t("home.startPlan")}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="font-display mb-4 text-2xl font-semibold">
          {t("home.browseByCategory")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories?.map((category) => (
            <Link
              key={category.id}
              to={`/category/${category.slug}`}
              className="flex items-center gap-2.5 rounded-xl border border-taupe-100 bg-white p-4 transition hover:border-olive-300 hover:shadow-sm"
            >
              <span className="text-2xl" aria-hidden="true">
                {category.icon || "•"}
              </span>
              <span className="text-sm font-medium">
                {localName(category)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold">
            {t("home.topRated")}
          </h2>
          <Link
            to="/vendors?ordering=-rating"
            className="text-sm font-medium text-olive-400 hover:text-forest-500"
          >
            {t("home.seeAll")} →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors?.results.slice(0, 6).map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      </section>
    </div>
  );
}
