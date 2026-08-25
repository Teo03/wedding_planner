import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { useI18n, useLocalName } from "../i18n";

/** Navbar dropdown: every top-level category with its subcategories. */
export default function CategoryMenu() {
  const { t } = useI18n();
  const localName = useLocalName();
  const { data: categories } = useAsync(() => api.categories(), []);
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
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-forest-600 hover:bg-cream-100"
      >
        {t("nav.categories")}
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2 4.5L6 8.5L10 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1 max-h-[70vh] w-[min(90vw,44rem)] overflow-y-auto rounded-xl border border-taupe-100 bg-white p-4 shadow-xl">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories?.map((category) => (
              <div key={category.id}>
                <Link
                  to={`/category/${category.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-sm font-semibold text-forest-600 hover:text-olive-400"
                >
                  {localName(category)}
                </Link>
                <ul className="mt-1 space-y-0.5">
                  {category.children.slice(0, 5).map((child) => (
                    <li key={child.id}>
                      <Link
                        to={`/category/${category.slug}?sub=${child.slug}`}
                        onClick={() => setOpen(false)}
                        className="block text-sm text-taupe-400 hover:text-forest-500"
                      >
                        {localName(child)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Link
            to="/vendors"
            onClick={() => setOpen(false)}
            className="mt-4 inline-block border-t border-taupe-100 pt-3 text-sm font-medium text-olive-400 hover:text-forest-500"
          >
            {t("nav.vendors")} →
          </Link>
        </div>
      )}
    </div>
  );
}
