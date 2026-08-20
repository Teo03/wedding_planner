import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  dictionaries,
  en,
  LANGUAGES,
  type Language,
} from "./translations";

export { LANGUAGES, LANGUAGE_LABELS } from "./translations";
export type { Language } from "./translations";

const STORAGE_KEY = "wedding-planner-language";

interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Look up a dotted key, e.g. t("nav.planList"), with {name} interpolation. */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nValue | null>(null);

function initialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (LANGUAGES as readonly string[]).includes(stored)) {
    return stored as Language;
  }
  return "mk";
}

function lookup(source: unknown, path: string[]): string | undefined {
  let node: unknown = source;
  for (const part of path) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const path = key.split(".");
      // Fall back to English for any key the active dictionary is missing,
      // then to the key itself so a typo is visible rather than silent.
      const value =
        lookup(dictionaries[language], path) ?? lookup(en, path) ?? key;
      return interpolate(value, vars);
    },
    [language],
  );

  const value = useMemo<I18nValue>(
    () => ({ language, setLanguage: setLanguageState, t }),
    [language, t],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Names that live in the database (categories, cities, regions) carry their
 * own Macedonian form; UI chrome comes from the dictionaries. Falls back to
 * the English name when a row hasn't been translated.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useLocalName() {
  const { language } = useI18n();
  return (item: { name: string; name_mk?: string } | null | undefined) => {
    if (!item) return "";
    return language === "mk" && item.name_mk ? item.name_mk : item.name;
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
