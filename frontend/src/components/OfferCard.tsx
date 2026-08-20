import type { Currency, Offer } from "../api/types";
import { useSimulator } from "../context/SimulatorContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../api/client";
import { convert, formatMoney } from "../lib/currency";
import { useEstimateNote, useI18n, useLocalName } from "../i18n";

interface Props {
  offer: Offer;
  vendor: { name: string; slug: string };
}

export default function OfferCard({ offer, vendor }: Props) {
  const sim = useSimulator();
  const { t } = useI18n();
  const localName = useLocalName();
  const estimateNote = useEstimateNote();
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
    <div className="rounded-lg border border-taupe-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-medium">{localName(offer)}</h4>
          <p className="mt-0.5 text-sm text-taupe-400">
            {describePrice(offer, sim.currency, t)}
          </p>
        </div>
        <button
          onClick={() =>
            inSim ? sim.removeOffer(offer.id) : sim.addOffer(offer, vendor)
          }
          className={`shrink-0 rounded px-3 py-1.5 text-sm font-medium ${
            inSim
              ? "bg-cream-200 text-taupe-500 hover:bg-taupe-100"
              : "bg-forest-500 text-cream-50 hover:bg-forest-600"
          }`}
        >
          {inSim ? t("vendor.removeFromPlan") : t("vendor.addToPlan")}
        </button>
      </div>

      {offer.description && (
        <p className="mt-2 text-sm text-taupe-500">
          {localName({ name: offer.description, name_mk: offer.description_mk })}
        </p>
      )}

      {est && (
        <div className="mt-3 rounded bg-cream-100 px-3 py-2 text-sm">
          {total !== null ? (
            <div className="flex items-center justify-between">
              <span className="text-taupe-400">
                {t("vendor.estimateFor", {
                  guests: est.effective_guests ?? sim.guestCount,
                })}
              </span>
              <span className="font-semibold">
                {formatMoney(total, sim.currency)}
              </span>
            </div>
          ) : (
            <span className="text-taupe-400">{estimateNote(est)}</span>
          )}
          {est.min_guest_applied && (
            <p className="mt-1 text-xs text-blush-400">{estimateNote(est)}</p>
          )}
        </div>
      )}

      {(offer.min_capacity || offer.max_capacity) && (
        <p className="mt-2 text-xs text-taupe-300">
          {t("vendor.capacity", {
            min: offer.min_capacity ?? "?",
            max: offer.max_capacity ?? "?",
          })}
        </p>
      )}
    </div>
  );
}

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function describePrice(
  offer: Offer,
  currency: Currency,
  t: Translate,
): string {
  const money = (v: string | null) =>
    v ? formatMoney(convert(Number(v), offer.price_currency, currency), currency) : "";
  switch (offer.price_type) {
    case "fixed":
      return t("price.fixed", { amount: money(offer.price_amount) });
    case "starting_at":
      return t("price.startingAt", { amount: money(offer.price_amount) });
    case "per_hour":
      return t("price.perHour", { amount: money(offer.price_amount) });
    case "per_guest":
      return t("price.perGuest", { amount: money(offer.price_per_guest) });
    case "tiered_per_guest": {
      if (!offer.price_tiers.length) return t("price.tiered");
      const min = Math.min(
        ...offer.price_tiers.map((tier) => Number(tier.price_per_guest)),
      );
      return t("price.fromPerGuest", {
        amount: formatMoney(
          convert(min, offer.price_currency, currency),
          currency,
        ),
      });
    }
    default:
      return "";
  }
}
