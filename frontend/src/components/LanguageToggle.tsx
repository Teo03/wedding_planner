import { LANGUAGE_LABELS, LANGUAGES, useI18n } from "../i18n";

export default function LanguageToggle() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div
      className="flex overflow-hidden rounded-md border border-taupe-100 bg-white"
      role="group"
      aria-label={t("nav.language")}
    >
      {LANGUAGES.map((code) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          title={LANGUAGE_LABELS[code]}
          aria-pressed={language === code}
          className={`px-2 py-1 text-xs font-semibold uppercase ${
            language === code
              ? "bg-forest-500 text-cream-50"
              : "text-taupe-400 hover:bg-cream-100"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
