import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { ChatPlan, ChatVendor } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useSimulator } from "../context/SimulatorContext";
import { useI18n } from "../i18n";
import Stars from "./Stars";

interface Turn {
  role: "user" | "assistant";
  content: string;
  vendors?: ChatVendor[];
  plan?: ChatPlan | null;
}

/**
 * Floating assistant. Answers are grounded in catalog rows retrieved by the
 * backend, so every vendor named here links to a real page.
 */
export default function ChatWidget() {
  const { t } = useI18n();
  const auth = useAuth();
  const sim = useSimulator();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, open, busy]);

  // Signed-out visitors have no catalog access, so the assistant has nothing
  // to ground an answer in.
  if (!auth.user) return null;

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setDraft("");
    setError(null);
    setTurns((current) => [...current, { role: "user", content: message }]);
    setBusy(true);
    try {
      const history = turns
        .slice(-6)
        .map((turn) => ({ role: turn.role, content: turn.content }));
      const reply = await api.chat(message, history, sim.guestCount);
      setTurns((current) => [
        ...current,
        {
          role: "assistant",
          content: reply.answer,
          vendors: reply.plan ? [] : reply.vendors,
          plan: reply.plan,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={t("chat.title")}
          className="fixed right-5 bottom-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-forest-500 text-cream-50 shadow-lg transition hover:bg-forest-600"
        >
          <ChatIcon />
        </button>
      )}

      {open && (
        <div className="fixed right-4 bottom-4 z-40 flex h-[min(34rem,80vh)] w-[min(24rem,92vw)] flex-col overflow-hidden rounded-2xl border border-taupe-100 bg-cream-50 shadow-2xl">
          <header className="flex items-center gap-2 border-b border-taupe-100 bg-white px-4 py-3">
            <span className="font-display text-lg font-semibold text-forest-600">
              {t("chat.title")}
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label={t("nav.close")}
              className="ml-auto rounded-md p-1.5 text-taupe-400 hover:bg-cream-100"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {turns.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-taupe-500">{t("chat.intro")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {[t("chat.example1"), t("chat.example2"), t("chat.example3")].map(
                    (example) => (
                      <button
                        key={example}
                        onClick={() => void send(example)}
                        className="rounded-full border border-taupe-100 bg-white px-3 py-1 text-xs text-taupe-500 hover:border-olive-300"
                      >
                        {example}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {turns.map((turn, index) => (
              <div key={index}>
                <div
                  className={
                    turn.role === "user"
                      ? "ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-forest-500 px-3 py-2 text-sm text-cream-50"
                      : "w-fit max-w-[92%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm whitespace-pre-line text-forest-600"
                  }
                >
                  {turn.content}
                </div>
                {turn.plan && <PlanCard plan={turn.plan} onClose={() => setOpen(false)} />}
                {turn.vendors && turn.vendors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {turn.vendors.map((vendor) => (
                      <VendorLine
                        key={vendor.slug}
                        vendor={vendor}
                        onClose={() => setOpen(false)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {busy && <p className="text-sm text-taupe-300">{t("chat.thinking")}</p>}
            {error && <p className="text-sm text-blush-400">{error}</p>}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
            className="flex items-center gap-2 border-t border-taupe-100 bg-white px-3 py-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("chat.placeholder")}
              maxLength={1000}
              className="flex-1 rounded-md border border-taupe-100 px-3 py-2 text-sm focus:border-olive-300 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="rounded-md bg-forest-500 px-3 py-2 text-sm font-medium text-cream-50 disabled:opacity-50"
            >
              {t("chat.send")}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function PlanCard({ plan, onClose }: { plan: ChatPlan; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mt-2 rounded-xl border border-taupe-100 bg-white p-3">
      <div className="flex items-baseline justify-between text-xs text-taupe-400">
        <span>{t("chat.planFor", { guests: plan.guests })}</span>
        <span>€{plan.budget_eur.toLocaleString()}</span>
      </div>
      <ul className="mt-2 space-y-1">
        {plan.lines.map((line) => (
          <li key={line.slug} className="flex items-baseline justify-between gap-2 text-sm">
            <Link
              to={`/vendors/${line.slug}`}
              onClick={onClose}
              className="truncate hover:text-olive-400"
            >
              {line.name}
            </Link>
            <span
              className={`shrink-0 tabular-nums ${
                line.over_allowance ? "text-blush-400" : "text-taupe-500"
              }`}
            >
              €{Math.round(line.estimated_eur).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-baseline justify-between border-t border-taupe-100 pt-2 text-sm font-semibold">
        <span>{t("chat.total")}</span>
        <span className="tabular-nums">€{Math.round(plan.total_eur).toLocaleString()}</span>
      </div>
      <p className="mt-1 text-xs text-taupe-300">
        {plan.remaining_eur >= 0
          ? t("chat.remaining", { amount: Math.round(plan.remaining_eur).toLocaleString() })
          : t("chat.over", { amount: Math.round(-plan.remaining_eur).toLocaleString() })}
      </p>
    </div>
  );
}

function VendorLine({ vendor, onClose }: { vendor: ChatVendor; onClose: () => void }) {
  return (
    <li>
      <Link
        to={`/vendors/${vendor.slug}`}
        onClick={onClose}
        className="flex items-center gap-2 rounded-lg border border-taupe-100 bg-white px-3 py-1.5 text-sm hover:border-olive-300"
      >
        <span className="truncate font-medium text-forest-600">{vendor.name}</span>
        {vendor.rating !== null && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-taupe-400">
            <Stars value={vendor.rating} size={11} />
            {vendor.rating.toFixed(1)}
          </span>
        )}
        {vendor.from_eur !== null && (
          <span className="ml-auto shrink-0 text-xs text-taupe-400">
            €{Math.round(vendor.from_eur).toLocaleString()}+
          </span>
        )}
      </Link>
    </li>
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.4 0-2.7-.3-3.9-.9L3 21l1.9-5.1A8.5 8.5 0 1 1 21 11.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
