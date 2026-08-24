import { useI18n } from "../i18n";

export default function PaginationControls({
  page,
  pages,
  onPageChange,
}: {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useI18n();

  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 pt-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded-md border border-taupe-100 bg-white px-3 py-1.5 text-sm transition hover:cursor-pointer hover:border-olive-300 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-taupe-100 disabled:hover:opacity-40"
      >
        {t("browse.prev")}
      </button>
      <span className="text-sm text-taupe-400">
        {t("browse.page", { page, pages })}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(pages, page + 1))}
        disabled={page >= pages}
        className="rounded-md border border-taupe-100 bg-white px-3 py-1.5 text-sm transition hover:cursor-pointer hover:border-olive-300 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-taupe-100 disabled:hover:opacity-40"
      >
        {t("browse.next")}
      </button>
    </div>
  );
}
