import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";

type TranslationVars = Record<string, string | number>;
type TranslatedError = {
  kind: "translation";
  key: string;
  vars?: TranslationVars;
};
type PlainError = { kind: "plain"; message: string };
type PasswordError = {
  kind: "password";
  reasons: Array<TranslatedError | PlainError>;
};
type RegisterError = TranslatedError | PlainError | PasswordError;

export default function Register() {
  const auth = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });
  const [error, setError] = useState<RegisterError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (auth.loading) {
    return (
      <div className="py-16 text-center text-sm text-taupe-400">
        {t("auth.loadingAccount")}
      </div>
    );
  }

  if (auth.user) {
    return <Navigate to="/" replace />;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await auth.register(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(parseRegisterError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-taupe-100 bg-white p-6 shadow-sm">
      <h1 className="font-display text-3xl font-semibold">{t("auth.signUp")}</h1>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-forest-600">
            {t("auth.firstName")}
            <input
              value={form.first_name}
              onChange={(e) => update("first_name", e.target.value)}
              autoComplete="given-name"
              className="mt-1 w-full rounded border border-taupe-100 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-forest-600">
            {t("auth.lastName")}
            <input
              value={form.last_name}
              onChange={(e) => update("last_name", e.target.value)}
              autoComplete="family-name"
              className="mt-1 w-full rounded border border-taupe-100 px-3 py-2"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-forest-600">
          {t("auth.username")}
          <input
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded border border-taupe-100 px-3 py-2"
            required
          />
        </label>
        <label className="block text-sm font-medium text-forest-600">
          {t("auth.email")}
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            autoComplete="email"
            className="mt-1 w-full rounded border border-taupe-100 px-3 py-2"
            required
          />
        </label>
        <label className="block text-sm font-medium text-forest-600">
          {t("auth.password")}
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            autoComplete="new-password"
            className="mt-1 w-full rounded border border-taupe-100 px-3 py-2"
            required
          />
        </label>
        {error && (
          <p className="text-sm text-blush-400">
            {renderRegisterError(error, t)}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-forest-500 px-4 py-2 font-medium text-white hover:bg-forest-600 disabled:cursor-wait disabled:bg-forest-300"
        >
          {submitting ? t("auth.creating") : t("auth.signUp")}
        </button>
      </form>
      <p className="mt-4 text-sm text-taupe-500">
        {t("auth.haveAccount")}{" "}
        <Link to="/login" className="font-medium text-olive-400">
          {t("auth.signIn")}
        </Link>
      </p>
    </section>
  );
}

function parseRegisterError(err: unknown): RegisterError {
  if (err instanceof ApiError && err.body) {
    if (typeof err.body.username === "object") {
      return { kind: "translation", key: "auth.errors.usernameTaken" };
    }
    if (typeof err.body.email === "object") {
      return { kind: "translation", key: "auth.errors.emailRegistered" };
    }

    const passwordMessages = fieldMessages(err.body.password);
    if (passwordMessages.length > 0) {
      return {
        kind: "password",
        reasons: passwordMessages.map(parsePasswordReason),
      };
    }
  }

  if (err instanceof Error && err.message) {
    return { kind: "plain", message: err.message };
  }
  return { kind: "translation", key: "auth.createFailed" };
}

function validateForm(form: {
  username: string;
  email: string;
  password: string;
}): RegisterError | null {
  if (!form.username.trim()) {
    return { kind: "translation", key: "auth.errors.usernameRequired" };
  }
  if (!form.email.trim()) {
    return { kind: "translation", key: "auth.errors.emailRequired" };
  }
  if (!isValidEmail(form.email)) {
    return { kind: "translation", key: "auth.errors.emailInvalid" };
  }
  if (!form.password) {
    return { kind: "translation", key: "auth.errors.passwordRequired" };
  }
  return null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function renderRegisterError(
  error: RegisterError | TranslatedError | PlainError,
  t: (key: string, vars?: TranslationVars) => string,
): string {
  if (error.kind === "plain") return error.message;
  if (error.kind === "translation") return t(error.key, error.vars);

  const reasons = error.reasons
    .map((reason) => renderRegisterError(reason, t))
    .join(" ");
  return t("auth.errors.passwordRequirements", { errors: reasons });
}

function fieldMessages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string") return [value];
  return [];
}

function parsePasswordReason(message: string): TranslatedError | PlainError {
  const tooShort = message.match(
    /^This password is too short\. It must contain at least (\d+) characters?\.$/,
  );
  if (tooShort) {
    return {
      kind: "translation",
      key: "auth.errors.passwordTooShort",
      vars: { minLength: tooShort[1] },
    };
  }
  if (message === "This password is too common.") {
    return { kind: "translation", key: "auth.errors.passwordTooCommon" };
  }
  if (message === "This password is entirely numeric.") {
    return {
      kind: "translation",
      key: "auth.errors.passwordEntirelyNumeric",
    };
  }
  if (message.startsWith("The password is too similar to")) {
    return { kind: "translation", key: "auth.errors.passwordTooSimilar" };
  }
  return { kind: "plain", message };
}
