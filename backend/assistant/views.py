"""Chat endpoint.

Retrieval always runs and always grounds the reply. The language model, when
configured, only rewrites those retrieved facts into prose -- it is never the
source of a vendor name, price or rating, so the assistant cannot invent a
business that isn't in the catalog.
"""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.auth import CookieJWTAuthentication

from . import intent, llm, retrieval

MAX_MESSAGE_CHARS = 1000
MAX_HISTORY = 6

SYSTEM_PROMPT = """You are the assistant for Wedding Planner, a catalog of \
wedding vendors in Macedonia.

Rules:
- Answer ONLY from the CATALOG DATA provided. Never invent a vendor, price,
  rating or phone number. If the data does not cover the question, say so and
  suggest what to search for instead.
- Prices are indicative planning estimates, not quotes. Say so when you give
  totals.
- A rating marked "google" is a snapshot from Google, not a member review.
  Vendors with no rating are genuinely unrated - never guess one.
- Reply in the SAME language as the user's message (Macedonian or English).
- Be concise: a short paragraph, then a compact list.
- Plain text only. No markdown, no asterisks, no tables. Use "- " for lists.
"""


class ChatView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = (request.data.get("message") or "").strip()[:MAX_MESSAGE_CHARS]
        if not message:
            return Response({"detail": "A message is required."}, status=400)

        filters = intent.parse(message)
        guests = filters["guests"] or _int(request.data.get("guests")) or 100
        budget = filters["budget"]

        plan = None
        if budget and filters["wants_plan"]:
            budget_eur = retrieval.to_eur(budget["amount"], budget["currency"])
            plan = retrieval.build_plan(budget_eur, guests, filters.get("city"))
            vendors = plan["lines"]
        else:
            vendors = retrieval.search(filters)

        grounded = compose(message, filters, guests, plan, vendors)
        history = _history(request.data.get("history"))
        answer = llm.complete(
            SYSTEM_PROMPT,
            [*history, {"role": "user", "content": _context_block(message, plan, vendors)}],
        )

        return Response(
            {
                "answer": answer or grounded,
                "source": "model" if answer else "catalog",
                "vendors": vendors,
                "plan": plan,
                "filters": {k: v for k, v in filters.items() if v},
            }
        )


def _context_block(message, plan, vendors):
    lines = [f"USER QUESTION: {message}", "", "CATALOG DATA:"]
    if plan:
        lines.append(
            f"Proposed plan for {plan['guests']} guests on a EUR {plan['budget_eur']:.0f} "
            f"budget. Estimated total EUR {plan['total_eur']:.0f}, "
            f"remaining EUR {plan['remaining_eur']:.0f}."
        )
    for vendor in vendors:
        rating = (
            f"{vendor['rating']} ({vendor['rating_source']})"
            if vendor.get("rating")
            else "no rating yet"
        )
        price = (
            f"from EUR {vendor['from_eur']:.0f}"
            if vendor.get("from_eur") is not None
            else "price on request"
        )
        lines.append(
            f"- {vendor['name']} | {', '.join(vendor['categories']) or 'vendor'} "
            f"| {vendor.get('city') or 'Macedonia'} | {rating} | {price}"
        )
    if not vendors:
        lines.append("(no vendors matched this question)")
    return "\n".join(lines)


def compose(message, filters, guests, plan, vendors):
    """A usable answer with no model involved."""
    if plan:
        head = (
            f"Here is a plan for {plan['guests']} guests on a €{plan['budget_eur']:,.0f} "
            f"budget. Estimated total €{plan['total_eur']:,.0f}"
        )
        head += (
            f", leaving €{plan['remaining_eur']:,.0f}."
            if plan["remaining_eur"] >= 0
            else f", which is €{abs(plan['remaining_eur']):,.0f} over."
        )
        body = "\n".join(
            f"• {line['name']} — {', '.join(line['categories']) or 'vendor'}"
            f" — €{line['estimated_eur']:,.0f}"
            for line in plan["lines"]
        )
        return f"{head}\n\n{body}\n\nThese are indicative estimates, not quotes."

    if not vendors:
        return (
            "I could not find anything matching that in the catalog. "
            "Try naming a category (venue, photographer, dress) or a city."
        )

    body = "\n".join(
        f"• {v['name']} — {v.get('city') or 'Macedonia'}"
        + (f" — €{v['from_eur']:,.0f}+" if v.get("from_eur") is not None else "")
        + (f" — {v['rating']}★" if v.get("rating") else "")
        for v in vendors
    )
    return f"Here is what I found in the catalog:\n\n{body}"


def _history(raw):
    if not isinstance(raw, list):
        return []
    cleaned = []
    for item in raw[-MAX_HISTORY:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = str(item.get("content") or "")[:MAX_MESSAGE_CHARS]
        if role in ("user", "assistant") and content:
            cleaned.append({"role": role, "content": content})
    return cleaned


def _int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
