"""Pull structured filters out of a free-text question, in Macedonian or English.

Retrieval is deliberately lexical rather than embedding-based: the catalog is
157 vendors over a fixed taxonomy, so matching category and city names directly
is both cheaper and more predictable than a vector index, and it needs no model
to answer at all.
"""
import re
import unicodedata

from catalog.models import Category
from locations.models import Location

# Words couples use that don't appear in the taxonomy itself.
#
# Entries are matched as STEMS, not whole words: Macedonian inflects heavily
# ("сала" / "сали" / "салата"), and matching only the dictionary form meant a
# plural silently failed to select a category -- which then returned an
# unfiltered list, so a spa could be presented as a wedding hall.
SYNONYMS = {
    "venues": ["venue", "hall", "restoran", "restaurant", "reception",
               "сал", "ресторан", "простор", "локац"],
    "catering-food": ["catering", "food", "menu", "cake", "кетеринг", "храна",
                      "торт", "мени", "послужув"],
    "photography-video": ["photo", "photographer", "video", "фото", "фотограф",
                          "видео", "снимањ"],
    "attire": ["dress", "gown", "suit", "tux", "венчаниц", "фустан", "одел",
               "невест", "младожен"],
    "beauty": ["makeup", "hair", "spa", "шминк", "фризер", "коса", "спа",
               "убавин"],
    "entertainment": ["band", "dj", "music", "orchestra", "бенд", "музик",
                      "оркестар", "диџеј", "забав"],
    "decor-flowers": ["flower", "decor", "bouquet", "цвеќ", "декор", "букет"],
    "rings-jewelry": ["ring", "jewel", "gold", "прстен", "накит", "злато",
                      "златар"],
    "planning-services": ["planner", "organiser", "organizer", "организатор",
                          "планер", "координатор"],
    "car-rental-transport": ["limo", "transport", "автомобил", "лимузин",
                             "превоз", "кочиј"],
    "print-stationery": ["invitation", "invite", "покан", "печат"],
    "ceremony-officiants": ["church", "ceremony", "mosque", "цркв", "церемониј",
                            "џамиј", "венчавк"],
}

BUDGET_WORDS = ("budget", "буџет", "spend", "потрош", "плам", "план", "plan")
QUALITY_WORDS = ("best", "top", "highest", "најдобр", "топ", "препорач", "recommend")


def _fold(text):
    """Lowercase and normalise to a composed form.

    NFC, not NFKD: decomposing splits Macedonian ќ and ѓ into a base letter
    plus a combining accent, so a literal like "цвеќ" stops matching text that
    looks identical on screen.
    """
    return unicodedata.normalize("NFC", text.lower())


def parse(message):
    """Return the filters a question implies. Everything is optional."""
    raw = message or ""
    text = _fold(raw)

    return {
        "category": _category(text),
        "city": _city(text),
        "budget": _budget(raw, text),
        "guests": _guests(raw, text),
        "wants_plan": any(word in text for word in BUDGET_WORDS),
        "wants_best": any(word in text for word in QUALITY_WORDS),
    }


def _category(text):
    # Real category names first -- they are the most specific signal.
    for category in Category.objects.filter(parent__isnull=True):
        for name in (category.name, category.name_mk):
            if name and _fold(name).split(" ")[0] in text and len(name) > 3:
                return category.slug
    for slug, words in SYNONYMS.items():
        if any(_fold(word) in text for word in words):
            if Category.objects.filter(slug=slug).exists():
                return slug
    return None


def _city(text):
    for location in Location.objects.all():
        for name in (location.name, location.name_mk):
            if name and _fold(name) in text:
                return location.slug
    return None


def _budget(raw, text):
    """Find a spend figure.

    A bare number is never a budget: "120 guests" and "budget 8000" appear in
    the same sentence, and taking the first number found made the headcount the
    budget. The amount has to be attached to a currency or to a budget word.
    """
    patterns = [
        # 8000 EUR / 8.000€ / 12k eur / 500000 ден
        r"(\d[\d\s.,]*)\s*(k|к)?\s*(eur\b|€|euro|евра|евро|mkd\b|ден\b|денари)",
        # €8000 / EUR 8000
        r"(?:eur\b|€|mkd\b|ден\b)\s*(\d[\d\s.,]*)\s*(k|к)?()",
        # budget of 8000 / буџет од 8000 / my budget is 12k
        r"(?:budget|буџет)\D{0,12}(\d[\d\s.,]*)\s*(k|к)?()",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, text):
            digits = re.sub(r"[^\d]", "", match.group(1))
            if not digits:
                continue
            # Skip anything that is plainly a headcount.
            tail = text[match.end() : match.end() + 12]
            if re.match(r"\s*(guests?|people|гост|лица|души)", tail):
                continue
            amount = int(digits)
            if match.group(2):
                amount *= 1000
            unit = (match.group(3) or "").strip() if match.lastindex >= 3 else ""
            currency = "MKD" if unit.startswith(("mkd", "ден")) else "EUR"
            if currency == "EUR" and re.search(r"(mkd|ден)", text) and not re.search(r"(eur|€)", text):
                currency = "MKD"
            return {"amount": amount, "currency": currency}
    return None


def _guests(raw, text):
    match = re.search(r"(\d{2,4})\s*(guests?|people|гост|лица|души)", text)
    if match:
        return int(match.group(1))
    match = re.search(r"(guests?|гости)\D{0,10}(\d{2,4})", text)
    if match:
        return int(match.group(2))
    return None
