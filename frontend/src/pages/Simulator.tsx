import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSimulator, type SimItem } from "../context/SimulatorContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../api/client";
import { convert, formatMoney } from "../lib/currency";
import type { Estimate } from "../api/types";

export default function Simulator() {
  const sim = useSimulator();
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
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Your budget is empty</h1>
        <p className="mt-2 text-stone-500">
          Add packages from vendor pages to build a running estimate.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-rose-600 px-5 py-2.5 font-medium text-white hover:bg-rose-700"
        >
          Browse vendors
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Wedding budget</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            Guests
            <input
              type="number"
              min={1}
              value={sim.guestCount}
              onChange={(e) => sim.setGuestCount(Number(e.target.value))}
              className="w-24 rounded border border-stone-300 px-2 py-1"
            />
          </label>
          <button
            onClick={sim.toggleCurrency}
            className="rounded border border-stone-300 px-3 py-1 text-sm font-medium hover:bg-stone-100"
          >
            {sim.currency}
          </button>
          <button
            onClick={sim.clear}
            className="rounded border border-stone-300 px-3 py-1 text-sm text-stone-600 hover:bg-stone-100"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {groups.map(([cat, items]) => (
          <div key={cat} className="rounded-xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-4 py-2 text-sm font-semibold text-stone-500">
              {items[0].categoryIcon} {cat}
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
                        className="font-medium hover:text-rose-700"
                      >
                        {item.offerName}
                      </Link>
                      <p className="text-sm text-stone-500">{item.vendorName}</p>
                      {est?.min_guest_applied && (
                        <p className="text-xs text-amber-700">{est.note}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        {val !== null
                          ? formatMoney(val, sim.currency)
                          : (est?.note ?? "…")}
                      </span>
                      <button
                        onClick={() => sim.removeOffer(item.offerId)}
                        className="text-stone-400 hover:text-rose-600"
                        aria-label="Remove"
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

      <div className="sticky bottom-0 flex items-center justify-between rounded-xl bg-stone-900 px-6 py-4 text-white">
        <span className="text-sm text-stone-300">
          Estimated total{hasPending ? " (some items need a quote)" : ""}
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
