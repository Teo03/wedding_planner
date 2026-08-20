import type { VendorListItem } from "../api/types";
import { useI18n } from "../i18n";
import Stars from "./Stars";

/**
 * A vendor's rating, or an honest "no ratings yet".
 *
 * Only 43 of the 157 seeded vendors carry a Google rating, so the unrated
 * case is the common one and has to read as deliberate rather than broken.
 */
export default function RatingBadge({
  vendor,
  size = 14,
}: {
  vendor: Pick<
    VendorListItem,
    "rating" | "rating_source" | "site_review_count" | "google_review_count"
  >;
  size?: number;
}) {
  const { t } = useI18n();

  if (vendor.rating === null) {
    return (
      <span className="text-xs text-taupe-300">{t("rating.noRating")}</span>
    );
  }

  const count =
    vendor.rating_source === "site"
      ? vendor.site_review_count
      : (vendor.google_review_count ?? 0);

  return (
    <span className="flex items-center gap-1.5">
      <Stars value={vendor.rating} size={size} />
      <span className="text-xs font-medium text-taupe-500">
        {vendor.rating.toFixed(1)}
      </span>
      {count > 0 && (
        <span className="text-xs text-taupe-300">
          ({count}
          {vendor.rating_source === "google" ? ` · ${t("rating.fromGoogle")}` : ""})
        </span>
      )}
    </span>
  );
}
