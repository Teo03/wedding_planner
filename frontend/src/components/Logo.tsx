import { Link } from "react-router-dom";
import { useI18n } from "../i18n";

/** The WP mark: monogram inside the arch used across the cover artwork. */
export default function Logo({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label={t("appName")}>
      <svg
        width="34"
        height="40"
        viewBox="0 0 34 40"
        className="shrink-0"
        aria-hidden="true"
      >
        <path
          d="M2 17a15 15 0 0 1 30 0v21H2z"
          className="fill-forest-500"
        />
        <path
          d="M6 17a11 11 0 0 1 22 0v17H6z"
          fill="none"
          className="stroke-cream-50"
          strokeWidth="1.5"
        />
        <text
          x="17"
          y="26"
          textAnchor="middle"
          className="fill-cream-50 font-display"
          fontSize="14"
          fontWeight="600"
        >
          WP
        </text>
      </svg>
      {!compact && (
        <span className="font-display text-xl leading-tight font-semibold text-forest-600">
          {t("appName")}
        </span>
      )}
    </Link>
  );
}
