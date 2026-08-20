import { useState } from "react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { useSimulator } from "../context/SimulatorContext";
import { useI18n } from "../i18n";
import CategoryMenu from "./CategoryMenu";
import Logo from "./Logo";
import SideDrawer from "./SideDrawer";

/**
 * Top bar carries only navigation and the plan list; guests, currency,
 * language and account live in the side drawer behind the menu button, which
 * keeps the bar to five targets instead of nine.
 */
export default function Layout({ children }: { children: ReactNode }) {
  const sim = useSimulator();
  const auth = useAuth();
  const { t } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The catalog endpoints are authenticated, so these menus would open empty
  // for a signed-out visitor rather than simply not being there.
  const signedIn = Boolean(auth.user);

  return (
    <div className="flex min-h-full flex-col bg-cream-50 text-forest-600">
      <header className="sticky top-0 z-20 border-b border-taupe-100 bg-cream-50/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Logo />

          {signedIn && (
            <nav className="hidden items-center gap-1 sm:flex">
              <CategoryMenu />
              <Link
                to="/vendors"
                className="rounded-md px-2 py-1.5 text-sm font-medium text-forest-600 hover:bg-cream-100"
              >
                {t("nav.vendors")}
              </Link>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            {signedIn && (
            <Link
              to="/plan"
              className="relative rounded-md bg-forest-500 px-3 py-1.5 text-sm font-medium text-cream-50 hover:bg-forest-600"
            >
              <span className="hidden sm:inline">{t("nav.planList")}</span>
              <span className="sm:hidden">{t("nav.plan")}</span>
              {sim.items.length > 0 && (
                <span className="absolute -top-2 -right-2 rounded-full bg-blush-300 px-1.5 text-xs font-semibold text-forest-600">
                  {sim.items.length}
                </span>
              )}
            </Link>
            )}

            <button
              onClick={() => setDrawerOpen(true)}
              aria-label={t("nav.menu")}
              aria-expanded={drawerOpen}
              className="rounded-md border border-taupe-100 bg-white p-2 text-forest-600 hover:border-olive-300"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M3 5h14M3 10h14M3 15h14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-taupe-100 bg-cream-100 py-6 text-center text-sm text-taupe-300">
        {t("footer")}
      </footer>
    </div>
  );
}
