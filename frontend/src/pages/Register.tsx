import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (auth.loading) {
    return (
      <div className="py-16 text-center text-sm text-taupe-400">
        Loading account...
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
      await auth.register(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setSubmitting(false);
    }
  }

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-taupe-100 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-forest-600">
            First name
            <input
              value={form.first_name}
              onChange={(e) => update("first_name", e.target.value)}
              autoComplete="given-name"
              className="mt-1 w-full rounded border border-taupe-100 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-forest-600">
            Last name
            <input
              value={form.last_name}
              onChange={(e) => update("last_name", e.target.value)}
              autoComplete="family-name"
              className="mt-1 w-full rounded border border-taupe-100 px-3 py-2"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-forest-600">
          Username
          <input
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded border border-taupe-100 px-3 py-2"
            required
          />
        </label>
        <label className="block text-sm font-medium text-forest-600">
          Email
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
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            autoComplete="new-password"
            className="mt-1 w-full rounded border border-taupe-100 px-3 py-2"
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-forest-500 px-4 py-2 font-medium text-white hover:bg-forest-600 disabled:cursor-wait disabled:bg-forest-300"
        >
          {submitting ? "Creating..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-taupe-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-olive-400">
          Sign in
        </Link>
      </p>
    </section>
  );
}
