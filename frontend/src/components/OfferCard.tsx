import type { Currency, Offer } from "../api/types";
import { useSimulator } from "../context/SimulatorContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../api/client";
import { convert, formatMoney } from "../lib/currency";

interface Props {
  offer: Offer;
  vendor: { name: string; slug: string };
}

export default function OfferCard({ offer, vendor }: Props) {
  const sim = useSimulator();
  const inSim = sim.has(offer.id);
  const { data: est } = useAsync(
    () => api.estimate(offer.id, sim.guestCount),
    [offer.id, sim.guestCount],
  );

  const total =
    est?.total !== null && est?.total !== undefined
      ? convert(Number(est.total), est.currency, sim.currency)
      : null;

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-medium">{offer.name}</h4>
          <p className="mt-0.5 text-sm text-stone-500">
            {describePrice(offer, sim.currency)}
          </p>
        </div>
        <button
          onClick={() =>
            inSim ? sim.removeOffer(offer.id) : sim.addOffer(offer, vendor)
          }
          className={`shrink-0 rounded px-3 py-1.5 text-sm font-medium ${
            inSim
              ? "bg-stone-200 text-stone-700 hover:bg-stone-300"
              : "bg-rose-600 text-white hover:bg-rose-700"
          }`}
        >
          {inSim ? "Remove" : "Add to budget"}
        </button>
      </div>

      {offer.description && (
        <p className="mt-2 text-sm text-stone-600">{offer.description}</p>
      )}

      {est && (
        <div className="mt-3 rounded bg-stone-50 px-3 py-2 text-sm">
          {total !== null ? (
            <div className="flex items-center justify-between">
              <span className="text-stone-500">
                Est. for {est.effective_guests ?? sim.guestCount} guests
              </span>
              <span className="font-semibold">
                {formatMoney(total, sim.currency)}
              </span>
            </div>
          ) : (
            <span className="text-stone-500">{est.note}</span>
          )}
          {est.min_guest_applied && (
            <p className="mt-1 text-xs text-amber-700">{est.note}</p>
          )}
        </div>
      )}

      {(offer.min_capacity || offer.max_capacity) && (
        <p className="mt-2 text-xs text-stone-400">
          Capacity {offer.min_capacity ?? "?"}
          {"–"}
          {offer.max_capacity ?? "?"} guests
        </p>
      )}
    </div>
  );
}

function describePrice(offer: Offer, currency: Currency): string {
  const money = (v: string | null) =>
    v ? formatMoney(convert(Number(v), offer.price_currency, currency), currency) : "";
  switch (offer.price_type) {
    case "fixed":
      return `${money(offer.price_amount)} fixed`;
    case "starting_at":
      return `from ${money(offer.price_amount)}`;
    case "per_hour":
      return `${money(offer.price_amount)} / hour`;
    case "per_guest":
      return `${money(offer.price_per_guest)} / guest`;
    case "tiered_per_guest": {
      if (!offer.price_tiers.length) return "tiered pricing";
      const min = Math.min(
        ...offer.price_tiers.map((t) => Number(t.price_per_guest)),
      );
      return `from ${formatMoney(convert(min, offer.price_currency, currency), currency)} / guest`;
    }
    default:
      return "";
  }
}
