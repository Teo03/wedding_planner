import { Link } from "react-router-dom";
import type { VendorListItem } from "../api/types";
import { convert, formatMoney } from "../lib/currency";
import { useSimulator } from "../context/SimulatorContext";

export default function VendorCard({ vendor }: { vendor: VendorListItem }) {
  const { currency } = useSimulator();
  const from =
    vendor.from_price !== null
      ? convert(Number(vendor.from_price), "EUR", currency)
      : null;

  return (
    <Link
      to={`/vendors/${vendor.slug}`}
      className="group overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-[3/2] overflow-hidden bg-stone-100">
        {vendor.cover_photo ? (
          <img
            src={vendor.cover_photo}
            alt={vendor.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-300">
            No photo
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{vendor.name}</h3>
          {from !== null && (
            <span className="whitespace-nowrap text-sm text-stone-500">
              from {formatMoney(from, currency)}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-stone-500">
          {vendor.location?.name ?? "—"}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {vendor.categories.slice(0, 3).map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700"
            >
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
