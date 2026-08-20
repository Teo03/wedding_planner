import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type { Currency, Offer } from "../api/types";

export interface SimItem {
  offerId: number;
  offerName: string;
  /** Kept alongside the English name so a saved plan re-renders in either
   *  language without re-fetching every offer. */
  offerNameMk: string;
  vendorName: string;
  vendorSlug: string;
  categoryName: string;
  categoryNameMk: string;
  categoryIcon: string;
  priceType: Offer["price_type"];
  offerCurrency: Currency;
}

interface SimState {
  guestCount: number;
  currency: Currency;
  items: SimItem[];
}

interface SimContextValue extends SimState {
  setGuestCount: (n: number) => void;
  setCurrency: (currency: Currency) => void;
  toggleCurrency: () => void;
  addOffer: (offer: Offer, vendor: { name: string; slug: string }) => void;
  removeOffer: (offerId: number) => void;
  clear: () => void;
  has: (offerId: number) => boolean;
}

const STORAGE_KEY = "wedding-simulator-v1";
const Ctx = createContext<SimContextValue | null>(null);

function load(): SimState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SimState;
  } catch {
    /* ignore malformed storage */
  }
  return { guestCount: 100, currency: "EUR", items: [] };
}

export function SimulatorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SimState>(load);
  const [subToTop, setSubToTop] = useState<
    Record<string, { name: string; name_mk: string; icon: string }>
  >({});

  // Build a subcategory-slug -> top-level-category map so plan line items can
  // be grouped the way a couple thinks about them (Venue, Catering, ...).
  useEffect(() => {
    api
      .categories()
      .then((cats) => {
        const map: Record<
          string,
          { name: string; name_mk: string; icon: string }
        > = {};
        for (const top of cats) {
          const entry = {
            name: top.name,
            name_mk: top.name_mk,
            icon: top.icon,
          };
          map[top.slug] = entry;
          for (const child of top.children) {
            map[child.slug] = entry;
          }
        }
        setSubToTop(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<SimContextValue>(
    () => ({
      ...state,
      setGuestCount: (n) =>
        setState((s) => ({ ...s, guestCount: Math.max(1, n || 1) })),
      setCurrency: (currency) => setState((s) => ({ ...s, currency })),
      toggleCurrency: () =>
        setState((s) => ({
          ...s,
          currency: s.currency === "EUR" ? "MKD" : "EUR",
        })),
      addOffer: (offer, vendor) =>
        setState((s) => {
          if (s.items.some((i) => i.offerId === offer.id)) return s;
          const topSlug = offer.categories[0]?.slug;
          const top = (topSlug && subToTop[topSlug]) || {
            name: "Other",
            name_mk: "Друго",
            icon: "•",
          };
          const item: SimItem = {
            offerId: offer.id,
            offerName: offer.name,
            offerNameMk: offer.name_mk,
            vendorName: vendor.name,
            vendorSlug: vendor.slug,
            categoryName: top.name,
            categoryNameMk: top.name_mk,
            categoryIcon: top.icon,
            priceType: offer.price_type,
            offerCurrency: offer.price_currency,
          };
          return { ...s, items: [...s.items, item] };
        }),
      removeOffer: (offerId) =>
        setState((s) => ({
          ...s,
          items: s.items.filter((i) => i.offerId !== offerId),
        })),
      clear: () => setState((s) => ({ ...s, items: [] })),
      has: (offerId) => state.items.some((i) => i.offerId === offerId),
    }),
    [state, subToTop],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSimulator() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useSimulator must be used within SimulatorProvider");
  return ctx;
}
