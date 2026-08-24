export const MIN_GUEST_COUNT = 1;
export const MAX_GUEST_COUNT = 1000;

export function clampGuestCount(value: number): number {
  if (!Number.isFinite(value)) return MIN_GUEST_COUNT;
  return Math.min(MAX_GUEST_COUNT, Math.max(MIN_GUEST_COUNT, Math.floor(value)));
}
