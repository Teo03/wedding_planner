import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { useSimulator } from "../context/SimulatorContext";

export default function Layout({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const sim = useSimulator();
  return (
    <div className="flex min-h-full flex-col bg-stone-50 text-stone-800">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="text-lg font-semibold text-rose-700">
            Venčanje<span className="text-stone-400">.mk</span>
          </Link>
          <nav className="hidden gap-1 text-sm sm:flex">
            <NavLink to="/" className={({ isActive }) => navCls(isActive)}>
              Home
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-1 text-sm text-stone-600">
              <span className="hidden sm:inline">Guests</span>
              <input
                type="number"
                min={1}
                value={sim.guestCount}
                onChange={(e) => sim.setGuestCount(Number(e.target.value))}
                className="w-20 rounded border border-stone-300 px-2 py-1 text-sm"
              />
            </label>
            <button
              onClick={sim.toggleCurrency}
              className="rounded border border-stone-300 px-2 py-1 text-sm font-medium hover:bg-stone-100"
              title="Toggle currency"
            >
              {sim.currency}
            </button>
            <Link
              to="/simulator"
              className="relative rounded bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
            >
              Budget
              {sim.items.length > 0 && (
                <span className="absolute -right-2 -top-2 rounded-full bg-stone-900 px-1.5 text-xs text-white">
                  {sim.items.length}
                </span>
              )}
            </Link>
            {auth.user ? (
              <div className="flex items-center gap-2">
                <span className="hidden max-w-32 truncate text-sm text-stone-600 md:inline">
                  {auth.user.first_name || auth.user.username}
                </span>
                <button
                  onClick={auth.logout}
                  className="rounded border border-stone-300 px-2 py-1 text-sm font-medium hover:bg-stone-100"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded border border-stone-300 px-2 py-1 text-sm font-medium hover:bg-stone-100"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-stone-200 bg-white py-6 text-center text-sm text-stone-400">
        Wedding Vendor Catalog · North Macedonia · demo
      </footer>
    </div>
  );
}

function navCls(active: boolean) {
  return `rounded px-2 py-1 ${
    active ? "font-medium text-rose-700" : "text-stone-600 hover:text-stone-900"
  }`;
}
