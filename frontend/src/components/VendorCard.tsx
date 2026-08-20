import { Link } from "react-router-dom";
import type { VendorListItem } from "../api/types";
import { convert, formatMoney } from "../lib/currency";
import { useSimulator } from "../context/SimulatorContext";
import { useI18n, useLocalName } from "../i18n";
import RatingBadge from "./RatingBadge";

export default function VendorCard({ vendor }: { vendor: VendorListItem }) {
  const { currency } = useSimulator();
  const { t } = useI18n();
  const localName = useLocalName();
  const from =
    vendor.from_price !== null
      ? convert(Number(vendor.from_price), "EUR", currency)
      : null;

  return (
    <Link
      to={`/vendors/${vendor.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-taupe-100 bg-white transition hover:border-olive-300 hover:shadow-md"
    >
      <div className="aspect-[3/2] overflow-hidden bg-cream-100">
        {vendor.cover_photo ? (
          <img
            src={vendor.cover_photo}
            alt={vendor.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-taupe-200">
            {vendor.name}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-tight font-semibold text-forest-600">
            {vendor.name}
          </h3>
          {from !== null && (
            <span className="shrink-0 text-sm whitespace-nowrap text-taupe-400">
              {t("vendor.from")} {formatMoney(from, currency)}
            </span>
          )}
        </div>

        <div className="mt-1.5">
          <RatingBadge vendor={vendor} />
        </div>

        <p className="mt-1 text-sm text-taupe-400">
          {vendor.location ? localName(vendor.location) : "—"}
        </p>

        <div className="mt-auto flex flex-wrap gap-1 pt-3">
          {vendor.categories
            .filter((category) => category.icon === "")
            .slice(0, 2)
            .map((category) => (
              <span
                key={category.id}
                className="rounded-full bg-olive-100 px-2 py-0.5 text-xs text-olive-400"
              >
                {localName(category)}
              </span>
            ))}
        </div>
      </div>
    </Link>
  );
}
