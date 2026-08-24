import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { RatingSummary, Review } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import Stars from "./Stars";

export default function ReviewSection({ vendorSlug }: { vendorSlug: string }) {
  const { t } = useI18n();
  const auth = useAuth();
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.reviews(vendorSlug);
      setSummary(data.summary);
      setReviews(data.results);
    } finally {
      setLoading(false);
    }
  }, [vendorSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const mine = reviews.find((review) => review.author_id === auth.user?.id);

  return (
    <section className="rounded-2xl border border-taupe-100 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold text-forest-600">
          {t("rating.reviews")}
        </h2>
        {summary && <SummaryLine summary={summary} />}
      </div>

      <ReviewForm
        vendorSlug={vendorSlug}
        existing={mine}
        onSaved={load}
        onDeleted={load}
      />

      <div className="mt-6 space-y-4">
        {loading && <p className="text-sm text-taupe-300">{t("browse.loading")}</p>}
        {!loading && reviews.length === 0 && (
          <p className="text-sm text-taupe-300">{t("rating.noReviews")}</p>
        )}
        {reviews.map((review) => (
          <article
            key={review.id}
            className="border-t border-taupe-100 pt-4 first:border-0 first:pt-0"
          >
            <div className="flex items-center gap-2">
              <Stars value={review.rating} size={14} />
              <span className="text-sm font-medium text-forest-600">
                {review.author}
              </span>
              {review.author_id === auth.user?.id && (
                <span className="rounded-full bg-blush-100 px-2 py-0.5 text-xs text-blush-400">
                  {t("rating.yourReview")}
                </span>
              )}
              <span className="ml-auto text-xs text-taupe-300">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>
            {review.title && (
              <h3 className="mt-1 font-medium text-forest-600">{review.title}</h3>
            )}
            {review.body && (
              <p className="mt-1 text-sm text-taupe-500">{review.body}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function SummaryLine({ summary }: { summary: RatingSummary }) {
  const { t } = useI18n();
  if (summary.rating === null) {
    return <span className="text-sm text-taupe-300">{t("rating.beFirst")}</span>;
  }
  const count =
    summary.rating_source === "site"
      ? summary.site_review_count
      : (summary.google_review_count ?? 0);
  return (
    <div className="flex items-center gap-2">
      <Stars value={summary.rating} size={18} />
      <span className="font-semibold text-forest-600">
        {summary.rating.toFixed(1)}
      </span>
      <span className="text-sm text-taupe-300">
        {t("rating.basedOn", { count })}
        {summary.rating_source === "google" ? ` · ${t("rating.fromGoogle")}` : ""}
      </span>
    </div>
  );
}

function ReviewForm({
  vendorSlug,
  existing,
  onSaved,
  onDeleted,
}: {
  vendorSlug: string;
  existing?: Review;
  onSaved: () => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the caller's existing review into the form so posting again edits it.
  useEffect(() => {
    setRating(existing?.rating ?? 0);
    setTitle(existing?.title ?? "");
    setBody(existing?.body ?? "");
  }, [existing]);

  const submit = async () => {
    if (rating < 1) {
      setError(t("rating.ratingRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.postReview(vendorSlug, { rating, title, body });
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await api.deleteReview(vendorSlug);
      setRating(0);
      setTitle("");
      setBody("");
      await onDeleted();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl bg-cream-100 p-4">
      <h3 className="text-sm font-semibold text-forest-600">
        {existing ? t("rating.editReview") : t("rating.writeReview")}
      </h3>

      <div className="mt-2 flex items-center gap-1">
        <span className="mr-1 text-sm text-taupe-500">
          {t("rating.yourRating")}
        </span>
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => setRating(score)}
            aria-label={`${score}`}
            aria-pressed={rating === score}
            className="p-0.5 text-taupe-100 transition hover:text-olive-300 aria-pressed:text-olive-300"
          >
            <span
              aria-hidden="true"
              className={rating >= score ? "text-olive-300" : undefined}
            >
              ★
            </span>
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("rating.reviewTitle")}
        maxLength={140}
        className="mt-3 w-full rounded-md border border-taupe-100 bg-white px-3 py-2 text-sm focus:border-olive-300 focus:outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("rating.reviewBody")}
        rows={3}
        className="mt-2 w-full rounded-md border border-taupe-100 bg-white px-3 py-2 text-sm focus:border-olive-300 focus:outline-none"
      />

      {error && <p className="mt-2 text-sm text-blush-400">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-md bg-forest-500 px-4 py-2 text-sm font-medium text-cream-50 hover:bg-forest-600 disabled:opacity-60"
        >
          {saving ? t("rating.saving") : t("rating.submit")}
        </button>
        {existing && (
          <button
            onClick={remove}
            disabled={saving}
            className="rounded-md border border-taupe-100 px-3 py-2 text-sm text-taupe-500 hover:bg-white"
          >
            {t("rating.deleteReview")}
          </button>
        )}
      </div>
    </div>
  );
}
