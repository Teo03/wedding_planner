"""Server-side pricing engine.

Single source of truth for turning an Offer + guest count into an estimate,
so pricing rules never drift between admin-entered data and the frontend.
"""
from dataclasses import asdict, dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional

GUEST_DEPENDENT = {"per_guest", "tiered_per_guest"}

_FLAT_NOTES = {
    "fixed": "Flat package price.",
    "per_hour": "Hourly rate; multiply by the number of booked hours.",
    "starting_at": "Starting price; final quote depends on the vendor.",
}


@dataclass
class Estimate:
    offer_id: int
    currency: str
    price_type: str
    guest_dependent: bool
    requested_guests: Optional[int]
    effective_guests: Optional[int]
    min_guest_applied: bool
    unit_price: Optional[str]  # per-guest rate used, as a money string
    total: Optional[str]  # computed total, as a money string
    note: str


def _money(value) -> str:
    return str(Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _match_tier(offer, guests):
    # price_tiers is ordered by guests_from; first bracket that contains
    # `guests` wins (guests_to == None means "and above").
    for tier in offer.price_tiers.all():
        lower_ok = guests >= tier.guests_from
        upper_ok = tier.guests_to is None or guests <= tier.guests_to
        if lower_ok and upper_ok:
            return tier
    return None


def estimate_offer(offer, guests: Optional[int] = None) -> dict:
    """Return a JSON-serializable estimate for one offer at a guest count."""
    ptype = offer.price_type
    guest_dependent = ptype in GUEST_DEPENDENT

    def build(**kwargs):
        base = dict(
            offer_id=offer.id,
            currency=offer.price_currency,
            price_type=ptype,
            guest_dependent=guest_dependent,
            requested_guests=guests,
            effective_guests=None,
            min_guest_applied=False,
            unit_price=None,
            total=None,
            note="",
        )
        base.update(kwargs)
        return asdict(Estimate(**base))

    # Flat, guest-independent price types.
    if not guest_dependent:
        if offer.price_amount is None:
            return build(note="No price set for this offer.")
        return build(
            unit_price=_money(offer.price_amount),
            total=_money(offer.price_amount),
            note=_FLAT_NOTES.get(ptype, ""),
        )

    # Guest-dependent types require a guest count.
    if guests is None:
        return build(note="Enter a guest count to price this offer.")

    effective = guests
    min_applied = False
    if offer.min_guest_count and guests < offer.min_guest_count:
        effective = offer.min_guest_count
        min_applied = True

    if ptype == "per_guest":
        if offer.price_per_guest is None:
            return build(
                effective_guests=effective,
                min_guest_applied=min_applied,
                note="No per-guest price set.",
            )
        unit = offer.price_per_guest
    else:  # tiered_per_guest
        tier = _match_tier(offer, effective)
        if tier is None:
            return build(
                effective_guests=effective,
                min_guest_applied=min_applied,
                note=f"No price tier matches {effective} guests.",
            )
        unit = tier.price_per_guest

    total = Decimal(unit) * effective
    if min_applied:
        note = (
            f"Priced for {effective} guests (vendor minimum) "
            f"because {guests} is below the minimum."
        )
    else:
        note = f"Priced for {effective} guests."

    return build(
        effective_guests=effective,
        min_guest_applied=min_applied,
        unit_price=_money(unit),
        total=_money(total),
        note=note,
    )
