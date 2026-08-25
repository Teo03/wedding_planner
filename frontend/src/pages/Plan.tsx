import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSimulator, type SimItem } from "../context/SimulatorContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../api/client";
import { convert, formatMoney } from "../lib/currency";
import type { Estimate } from "../api/types";
import { useEstimateNote, useI18n, useLocalName } from "../i18n";
import GuestCountInput from "../components/GuestCountInput";
import CurrencyPicker from "../components/CurrencyPicker";
import Breadcrumbs from "../components/Breadcrumbs";

export default function Plan() {
  const sim = useSimulator();
  const { t } = useI18n();
  const estimateNote = useEstimateNote();
  const localName = useLocalName();
  const ids = sim.items.map((i) => i.offerId).join(",");

  const { data: estimates, loading } = useAsync(async () => {
    const results = await Promise.all(
      sim.items.map((i) => api.estimate(i.offerId, sim.guestCount)),
    );
    const map: Record<number, Estimate> = {};
    results.forEach((e) => {
      map[e.offer_id] = e;
    });
    return map;
  }, [ids, sim.guestCount]);

  const groups = useMemo(() => groupByCategory(sim.items), [sim.items]);

  let total = 0;
  let hasPending = false;
  for (const item of sim.items) {
    const est = estimates?.[item.offerId];
    if (est?.total) total += convert(Number(est.total), est.currency, sim.currency);
    else if (est && est.total === null) hasPending = true;
  }

  if (sim.items.length === 0) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: t("nav.home"), to: "/" },
            { label: t("plan.title") },
          ]}
        />
        <div className="py-16 text-center">
          <h1 className="font-display text-3xl font-semibold">
            {t("plan.empty")}
          </h1>
          <p className="mt-2 text-taupe-400">{t("plan.emptyLead")}</p>
          <Link
            to="/vendors"
            className="mt-6 inline-block rounded-lg bg-forest-500 px-5 py-2.5 font-medium text-cream-50 hover:bg-forest-600"
          >
            {t("plan.browseVendors")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: t("nav.home"), to: "/" },
          { label: t("plan.title") },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold">{t("plan.title")}</h1>
        <div className="flex items-center gap-2">
          <GuestCountInput />
          <CurrencyPicker />
          <button
            onClick={sim.clear}
            className="rounded-md border border-taupe-100 bg-white px-3 py-1.5 text-sm text-taupe-500 hover:border-olive-300"
          >
            {t("plan.clear")}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {groups.map(([cat, items]) => (
          <div key={cat} className="rounded-xl border border-taupe-100 bg-white">
            <div className="border-b border-taupe-100 bg-cream-100 px-4 py-2 text-sm font-semibold text-taupe-500">
              {localName({
                name: cat,
                name_mk: items[0].categoryNameMk,
              })}
            </div>
            <ul>
              {items.map((item) => {
                const est = estimates?.[item.offerId];
                const val =
                  est?.total !== null && est?.total !== undefined
                    ? convert(Number(est.total), est.currency, sim.currency)
                    : null;
                return (
                  <li
                    key={item.offerId}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <Link
                        to={`/vendors/${item.vendorSlug}`}
                        className="font-medium hover:text-olive-400"
                      >
                        {localName({
                          name: item.offerName,
                          name_mk: item.offerNameMk,
                        })}
                      </Link>
                      <p className="text-sm text-taupe-400">{item.vendorName}</p>
                      {est?.min_guest_applied && (
                        <p className="text-xs text-blush-400">
                          {estimateNote(est)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        {val !== null
                          ? formatMoney(val, sim.currency)
                          : estimateNote(est) || "…"}
                      </span>
                      <button
                        onClick={() => sim.removeOffer(item.offerId)}
                        className="text-taupe-300 hover:text-blush-400"
                        aria-label={t("plan.remove")}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 flex items-center justify-between rounded-xl bg-forest-500 px-6 py-4 text-cream-50">
        <span className="text-sm text-cream-200">
          {t("plan.estimatedTotal")}
          {hasPending ? ` (${t("plan.someNeedQuote")})` : ""}
        </span>
        <span className="text-2xl font-semibold">
          {loading ? "…" : formatMoney(total, sim.currency)}
        </span>
      </div>
    </div>
  );
}

function groupByCategory(items: SimItem[]): [string, SimItem[]][] {
  const map = new Map<string, SimItem[]>();
  for (const item of items) {
    const arr = map.get(item.categoryName) ?? [];
    arr.push(item);
    map.set(item.categoryName, arr);
  }
  return Array.from(map.entries());
}
