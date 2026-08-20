import { useEffect, useRef, useState } from "react";
import type { Currency } from "../api/types";
import { useSimulator } from "../context/SimulatorContext";
import { useI18n } from "../i18n";

const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "MKD", label: "Македонски денар", symbol: "ден" },
];

/**
 * Currency control: a single money button that opens the choice, rather than
 * a two-state toggle that made you cycle through to find the one you wanted.
 */
export default function CurrencyPicker() {
  const sim = useSimulator();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("nav.currency")}
        title={t("nav.currency")}
        className="flex items-center gap-1 rounded-md border border-taupe-100 bg-white px-2 py-1.5 text-sm font-medium text-forest-600 hover:border-olive-300"
      >
        <DollarSign />
        <span>{sim.currency}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-lg border border-taupe-100 bg-white py-1 shadow-lg"
        >
          {CURRENCIES.map((currency) => (
            <li key={currency.code}>
              <button
                role="option"
                aria-selected={sim.currency === currency.code}
                onClick={() => {
                  sim.setCurrency(currency.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-cream-100 ${
                  sim.currency === currency.code
                    ? "font-semibold text-forest-600"
                    : "text-taupe-500"
                }`}
              >
                <span>{currency.label}</span>
                <span className="text-taupe-300">{currency.symbol}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DollarSign() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2v20M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.8 5 3.3 5 1.4 5 3.4-2.2 3.3-5 3.3-5-1.2-5-3.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
