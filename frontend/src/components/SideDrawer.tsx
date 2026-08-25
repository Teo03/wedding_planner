import { useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../context/AuthContext";
import { useSimulator } from "../context/SimulatorContext";
import { useI18n, useLocalName } from "../i18n";
import CurrencyPicker from "./CurrencyPicker";
import GuestCountInput from "./GuestCountInput";
import LanguageToggle from "./LanguageToggle";

/**
 * Slide-over panel holding everything that used to crowd the top bar:
 * wedding settings, language, account, and the full category list.
 */
export default function SideDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const localName = useLocalName();
  const auth = useAuth();
  const sim = useSimulator();
  const { data: categories } = useAsync(() => api.categories(), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Don't let the page scroll behind an open drawer.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-forest-600/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-hidden={!open}
        aria-label={t("nav.menu")}
        className={`fixed top-0 right-0 z-50 flex h-full w-[19rem] flex-col overflow-y-auto border-l border-taupe-100 bg-cream-50 shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-taupe-100 px-4 py-3">
          <span className="font-display text-lg font-semibold">
            {t("nav.menu")}
          </span>
          <button
            onClick={onClose}
            aria-label={t("nav.close")}
            className="rounded-md p-1.5 text-taupe-400 hover:bg-cream-100"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <Section title={t("nav.weddingSettings")}>
          <Row label={t("nav.guests")}>
            <GuestCountInput showLabel={false} />
          </Row>
          <Row label={t("nav.currency")}>
            <CurrencyPicker />
          </Row>
          <Row label={t("nav.language")}>
            <LanguageToggle />
          </Row>
        </Section>

        {auth.user && (
        <Section title={t("nav.categories")}>
          <ul className="space-y-0.5">
            {categories?.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/category/${category.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-forest-600 hover:bg-cream-100"
                >
                  {localName(category)}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
        )}

        <div className="mt-auto border-t border-taupe-100 p-4">
          {auth.user ? (
            <>
              <p className="text-sm text-taupe-400">
                {auth.user.first_name || auth.user.username}
              </p>
              <button
                onClick={() => {
                  onClose();
                  void auth.logout();
                }}
                className="mt-2 w-full rounded-md border border-taupe-100 bg-white px-3 py-2 text-sm font-medium text-taupe-500 hover:border-olive-300"
              >
                {t("nav.signOut")}
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="block w-full rounded-md bg-forest-500 px-3 py-2 text-center text-sm font-medium text-cream-50"
            >
              {t("nav.signIn")}
            </Link>
          )}
          {sim.items.length > 0 && (
            <Link
              to="/plan"
              onClick={onClose}
              className="mt-2 block text-center text-sm text-olive-400 hover:text-forest-500"
            >
              {t("nav.planList")} ({sim.items.length})
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-taupe-100 px-4 py-4">
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-taupe-300 uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-taupe-500">{label}</span>
      {children}
    </div>
  );
}
