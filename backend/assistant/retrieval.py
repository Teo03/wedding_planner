"""Fetch the catalog rows an answer should be grounded in.

This is the R in RAG. It returns plain dicts so the same payload can either be
handed to a language model as context or rendered directly when no model is
configured.
"""
from decimal import Decimal

from catalog.pricing import estimate_offer
from vendors.views import filter_vendors, order_vendors, vendor_queryset

# Roughly how a wedding budget splits, by top-level category slug. Used to give
# each category a ceiling when proposing a plan, so one venue cannot swallow
# everything. Shares are indicative planning heuristics, not sourced figures.
BUDGET_SHARES = [
    ("venues", 0.34),
    ("catering-food", 0.16),
    ("photography-video", 0.12),
    ("attire", 0.11),
    ("decor-flowers", 0.08),
    ("entertainment", 0.08),
    ("rings-jewelry", 0.05),
    ("beauty", 0.03),
    ("print-stationery", 0.03),
]

MKD_PER_EUR = Decimal("61.5")


def to_eur(amount, currency):
    amount = Decimal(str(amount))
    return amount / MKD_PER_EUR if currency == "MKD" else amount


def search(filters, limit=8):
    """Vendors matching the parsed intent, best-rated first."""
    params = {}
    if filters.get("category"):
        params["category"] = filters["category"]
    if filters.get("city"):
        params["city"] = filters["city"]
    if filters.get("budget"):
        params["max_price"] = str(
            int(to_eur(filters["budget"]["amount"], filters["budget"]["currency"]))
        )
    vendors = filter_vendors(vendor_queryset(), params)
    vendors = order_vendors(vendors, "-rating" if filters.get("wants_best") else "name")
    return [_summarise(v, filters.get("guests")) for v in vendors[:limit]]


def build_plan(budget_eur, guests, city=None):
    """Pick one affordable vendor per category, inside each category's share."""
    lines, total = [], Decimal("0")
    for slug, share in BUDGET_SHARES:
        allowance = Decimal(str(budget_eur)) * Decimal(str(share))
        params = {"category": slug}
        if city:
            params["city"] = city
        candidates = order_vendors(
            filter_vendors(vendor_queryset(), params), "-rating"
        )
        picked = None
        for vendor in candidates[:40]:
            cost = _cheapest_cost(vendor, guests)
            if cost is None:
                continue
            if cost <= allowance or picked is None:
                picked = (vendor, cost)
                if cost <= allowance:
                    break
        if not picked:
            continue
        vendor, cost = picked
        total += cost
        lines.append(
            {
                **_summarise(vendor, guests),
                "category_slug": slug,
                "allowance_eur": float(round(allowance, 2)),
                "estimated_eur": float(round(cost, 2)),
                "over_allowance": cost > allowance,
            }
        )
    return {
        "budget_eur": float(budget_eur),
        "guests": guests,
        "total_eur": float(round(total, 2)),
        "remaining_eur": float(round(Decimal(str(budget_eur)) - total, 2)),
        "lines": lines,
    }


def _cheapest_cost(vendor, guests):
    """Lowest realistic cost of booking this vendor, priced for the headcount."""
    best = None
    for offer in vendor.offers.all():
        if not offer.is_active:
            continue
        estimate = estimate_offer(offer, guests)
        total = estimate.get("total")
        if total is None:
            continue
        value = Decimal(total)
        if best is None or value < best:
            best = value
    return best


def _summarise(vendor, guests):
    cost = _cheapest_cost(vendor, guests)
    rating = getattr(vendor, "_rating", None)
    return {
        "name": vendor.name,
        "slug": vendor.slug,
        "city": vendor.location.name if vendor.location else None,
        "categories": [c.name for c in vendor.categories.all() if c.parent_id],
        "rating": round(rating, 2) if rating else None,
        "rating_source": "site"
        if getattr(vendor, "_site_rating", None)
        else ("google" if vendor.google_rating is not None else None),
        "from_eur": float(cost) if cost is not None else None,
        "phone": vendor.contact.phone if hasattr(vendor, "contact") else "",
    }
