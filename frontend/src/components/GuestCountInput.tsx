import { useEffect, useState } from "react";
import { useSimulator } from "../context/SimulatorContext";
import { useI18n } from "../i18n";
import { clampGuestCount, MAX_GUEST_COUNT } from "../lib/guests";

/**
 * Guest count input.
 *
 * Held as a string while editing rather than pushed straight through Number().
 * Clearing the box used to yield Number("") === 0, which the store clamped
 * back to 1, so the field refilled with "1" between keystrokes and every
 * entry ended up prefixed with it -- typing "50" produced "150". The draft is
 * only committed once it parses, and an empty box is allowed mid-edit.
 */
export default function GuestCountInput({
  className = "",
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const sim = useSimulator();
  const { t } = useI18n();
  const [draft, setDraft] = useState(String(sim.guestCount));

  // Track external changes (e.g. restored from storage) without fighting typing.
  useEffect(() => {
    setDraft((current) =>
      Number(current) === sim.guestCount ? current : String(sim.guestCount),
    );
  }, [sim.guestCount]);

  const commit = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, "");
    if (digits === "") {
      setDraft("");
      return; // let the field be empty while editing
    }
    const parsed = Number(digits);
    const clamped = clampGuestCount(parsed);
    setDraft(String(clamped));
    sim.setGuestCount(clamped);
  };

  return (
    <label className={`flex items-center gap-1.5 text-sm ${className}`}>
      {showLabel && (
        <span className="hidden text-taupe-500 sm:inline">
          {t("nav.guests")}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={String(MAX_GUEST_COUNT).length}
        value={draft}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => {
          // Snap back to the last valid count if they left it empty.
          if (draft === "" || Number(draft) < 1) setDraft(String(sim.guestCount));
        }}
        aria-label={t("nav.guests")}
        className="w-16 rounded-md border border-taupe-100 bg-white px-2 py-1 text-sm text-forest-600 focus:border-olive-300 focus:outline-none"
      />
    </label>
  );
}
