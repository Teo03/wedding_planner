import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";

export default function Login() {
  const auth = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    setSubmitting(true);
    try {
      await auth.login(username, password);
      const next = new URLSearchParams(location.search).get("next") || "/";
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.signInFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-taupe-100 bg-white p-6 shadow-sm">
      <h1 className="font-display text-3xl font-semibold">{t("auth.signIn")}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-forest-600">
          {t("auth.username")}
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded border border-taupe-100 px-3 py-2"
            required
          />
        </label>
        <label className="block text-sm font-medium text-forest-600">
          {t("auth.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded border border-taupe-100 px-3 py-2"
            required
          />
        </label>
        {error && <p className="text-sm text-blush-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-forest-500 px-4 py-2 font-medium text-white hover:bg-forest-600 disabled:cursor-wait disabled:bg-forest-300"
        >
          {submitting ? t("auth.signingIn") : t("auth.signIn")}
        </button>
      </form>
      <p className="mt-4 text-sm text-taupe-500">
        {t("auth.newHere")}{" "}
        <Link to="/register" className="font-medium text-olive-400">
          {t("auth.createAccount")}
        </Link>
      </p>
    </section>
  );
}
