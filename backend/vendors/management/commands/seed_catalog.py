"""Import the team's vendor research sheet into the catalog (idempotent).

Source: seed_data/wedding-vendor-seed-data-v4.xlsx, exported to
seed_data/vendors.json so seeding needs no spreadsheet reader at runtime.
Depends on seed_taxonomy + seed_locations having run first.

Two things in here are synthesised rather than sourced, because the sheet
doesn't carry them:
  * Offers/prices. The sheet has no pricing, but the plan list and estimator
    need something to price. Offers are generated per subcategory from the
    templates below, deterministically per vendor slug so re-runs are stable.
  * Cover photos. Vendor-owned photos couldn't be licensed for this demo (see
    the sheet's own "ON PHOTOS" note), so each vendor gets a licensed image
    matched to its subcategory, or a real photo of the actual place for the
    landmark venues. Attribution rides along on the Media row.

Google ratings ARE real, copied straight from the sheet's snapshot columns.
"""
import hashlib
import json
import shutil
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from catalog.models import Category, Offer, OfferPriceTier
from locations.models import Location, Region
from media.models import Media
from vendors.models import Contact, Vendor

SEED_DIR = Path(settings.BASE_DIR) / "seed_data"

# Sheet subcategory -> (top-level taxonomy name, taxonomy subcategory name).
CATEGORY_MAP = {
    "Wedding Dress Shops": ("Attire", "Wedding Dress Shops"),
    "Suit/Tux Rental & Menswear": ("Attire", "Suit/Tux Rental & Menswear"),
    "Tailors & Alterations": ("Attire", "Tailors & Alterations"),
    "Accessories": ("Attire", "Accessories"),
    "Wedding Decor & Flowers": ("Decor & Flowers", "Wedding Decor & Flowers"),
    "Balloon Decor": ("Decor & Flowers", "Balloon Decor"),
    "Event Furniture/Lighting Rental": ("Decor & Flowers", "Furniture & Lighting Rental"),
    "Event Rental": ("Decor & Flowers", "Furniture & Lighting Rental"),
    "Florists": ("Decor & Flowers", "Florists"),
    "Decorators": ("Decor & Flowers", "Decorators"),
    "Limousine/Cabriolet Rental": ("Car Rental & Transport", "Limousine/Cabriolet Rental"),
    "Limousine Rental": ("Car Rental & Transport", "Limousine/Cabriolet Rental"),
    "Rent-a-Car (general)": ("Car Rental & Transport", "Rent-a-Car (general)"),
    "Horse-Drawn Carriage Rental": ("Car Rental & Transport", "Horse-Drawn Carriage Rental"),
    "Restaurant / Event Space": ("Venues", "Restaurant / Event Space"),
    "Villa / Private Estate": ("Venues", "Villa / Private Estate"),
    "Outdoor Venue": ("Venues", "Outdoor Venue"),
    "Photo/Video Combined Studios": ("Photography & Video", "Photo/Video Combined Studios"),
    "Photographers": ("Photography & Video", "Photographers"),
    "Orthodox Church": ("Ceremony & Officiants", "Orthodox Church"),
    "Civil Ceremony / Registry Office": ("Ceremony & Officiants", "Civil Ceremony / Registry Office"),
    "Mosque": ("Ceremony & Officiants", "Mosque"),
    "Cake & Dessert": ("Catering & Food", "Cake & Dessert"),
    "Catering Companies": ("Catering & Food", "Catering Companies"),
    "Traditional/Folklore Orchestras": ("Entertainment", "Traditional/Folklore Orchestras"),
    "Live Bands": ("Entertainment", "Live Bands"),
    "MC / Wedding Host / Music Groups": ("Entertainment", "MC / Wedding Host"),
    "Chamber/String Ensembles": ("Entertainment", "Chamber/String Ensembles"),
    "Event AV / Lighting & Sound Rental": ("Entertainment", "Event AV / Lighting & Sound Rental"),
    "Jewelers": ("Rings & Jewelry", "Jewelers"),
    "Makeup Artists": ("Beauty", "Makeup Artists"),
    "Hair Stylists & Makeup": ("Beauty", "Hair Stylists & Makeup"),
    "Spas / Pre-wedding Treatments": ("Beauty", "Spas / Pre-wedding Treatments"),
    "Full-Service Wedding Planners": ("Planning Services", "Full-Service Wedding Planners"),
    "Invitation Designers/Printers": ("Print & Stationery", "Invitation Designers/Printers"),
    "Favor Tags & Packaging Print": ("Print & Stationery", "Favor Tags & Packaging Print"),
    "Invitation Designers/Printers & Favors": ("Print & Stationery", "Invitation Designers/Printers"),
}

# Sheet subcategory -> image theme in seed_data/media/.
THEME_MAP = {
    "Wedding Dress Shops": "wedding-dress-shops",
    "Suit/Tux Rental & Menswear": "menswear",
    "Tailors & Alterations": "tailors",
    "Accessories": "accessories",
    "Wedding Decor & Flowers": "decor-flowers",
    "Balloon Decor": "balloon-decor",
    "Event Furniture/Lighting Rental": "event-rental",
    "Event Rental": "event-rental",
    "Florists": "florists",
    "Decorators": "decorators",
    "Limousine/Cabriolet Rental": "limousine",
    "Limousine Rental": "limousine",
    "Rent-a-Car (general)": "limousine",
    "Horse-Drawn Carriage Rental": "carriage",
    "Restaurant / Event Space": "restaurant-venue",
    "Villa / Private Estate": "villa",
    "Outdoor Venue": "outdoor-venue",
    "Photo/Video Combined Studios": "photography",
    "Photographers": "photography",
    "Orthodox Church": "mk-skopje-cathedral",
    "Civil Ceremony / Registry Office": "civil-ceremony",
    "Mosque": "mk-tetovo-mosque",
    "Cake & Dessert": "cake",
    "Catering Companies": "catering",
    "Traditional/Folklore Orchestras": "folklore",
    "Live Bands": "live-band",
    "MC / Wedding Host / Music Groups": "mc-host",
    "Chamber/String Ensembles": "string-ensemble",
    "Event AV / Lighting & Sound Rental": "av-lighting",
    "Jewelers": "jewelers",
    "Makeup Artists": "makeup",
    "Hair Stylists & Makeup": "hair",
    "Spas / Pre-wedding Treatments": "spa",
    "Full-Service Wedding Planners": "planners",
    "Invitation Designers/Printers": "invitations",
    "Favor Tags & Packaging Print": "favors",
    "Invitation Designers/Printers & Favors": "invitations",
}

# Vendors that ARE the identifiable place, so a real photo of it is correct.
PLACE_PHOTOS = {
    "sveti-jovan-kaneo": "mk-ohrid-church",
    "carska-gradina": "mk-bitola",
    "sarena-dzamija": "mk-tetovo-mosque",
    "kanevce": "mk-ohrid",
    "metropol-lake-resort-hotel-metropol-belvju": "mk-ohrid",
    "oreov-lad": "mk-matka",
}

# subcategory -> (offer name, price_type, low, high, unit note)
OFFER_TEMPLATES = {
    "Wedding Dress Shops": [("Bridal gown + fitting", "starting_at", 450, 1600)],
    "Suit/Tux Rental & Menswear": [("Groom's suit hire", "starting_at", 120, 420)],
    "Tailors & Alterations": [("Alterations & fitting", "fixed", 40, 160)],
    "Accessories": [("Veil & accessories set", "starting_at", 60, 260)],
    "Wedding Decor & Flowers": [("Ceremony & table decor", "fixed", 350, 1800)],
    "Balloon Decor": [("Balloon arch & installation", "fixed", 120, 520)],
    "Event Furniture/Lighting Rental": [("Furniture & lighting hire", "fixed", 300, 1500)],
    "Event Rental": [("Event equipment hire", "fixed", 300, 1500)],
    "Florists": [("Bridal bouquet & buttonholes", "fixed", 90, 380)],
    "Decorators": [("Full venue styling", "fixed", 450, 2200)],
    "Limousine/Cabriolet Rental": [("Wedding car, 4 hours", "per_hour", 45, 120)],
    "Limousine Rental": [("Wedding car, 4 hours", "per_hour", 45, 120)],
    "Rent-a-Car (general)": [("Guest car hire, per day", "fixed", 35, 90)],
    "Horse-Drawn Carriage Rental": [("Carriage arrival", "fixed", 200, 600)],
    "Restaurant / Event Space": [("Reception package", "tiered_per_guest", 22, 48)],
    "Villa / Private Estate": [("Private estate hire", "fixed", 1200, 4500)],
    "Outdoor Venue": [("Outdoor ceremony & reception", "tiered_per_guest", 25, 55)],
    "Photo/Video Combined Studios": [("Photo + video, full day", "fixed", 700, 2400)],
    "Photographers": [("Full-day photography", "fixed", 450, 1500)],
    "Orthodox Church": [("Church ceremony", "fixed", 60, 200)],
    "Civil Ceremony / Registry Office": [("Civil ceremony", "fixed", 30, 120)],
    "Mosque": [("Nikah ceremony", "fixed", 50, 180)],
    "Cake & Dessert": [("Wedding cake & sweet table", "fixed", 120, 600)],
    "Catering Companies": [("Plated dinner service", "per_guest", 18, 42)],
    "Traditional/Folklore Orchestras": [("Folklore orchestra set", "fixed", 350, 1100)],
    "Live Bands": [("Live band, full evening", "fixed", 400, 1600)],
    "MC / Wedding Host / Music Groups": [("MC & hosting", "fixed", 200, 700)],
    "Chamber/String Ensembles": [("String ensemble, ceremony", "fixed", 250, 800)],
    "Event AV / Lighting & Sound Rental": [("Sound & lighting rig", "fixed", 300, 1400)],
    "Jewelers": [("Wedding band pair", "starting_at", 250, 1400)],
    "Makeup Artists": [("Bridal makeup + trial", "fixed", 60, 220)],
    "Hair Stylists & Makeup": [("Bridal hair & makeup", "fixed", 80, 280)],
    "Spas / Pre-wedding Treatments": [("Pre-wedding spa day", "fixed", 70, 260)],
    "Full-Service Wedding Planners": [("Full planning & coordination", "fixed", 900, 3500)],
    "Invitation Designers/Printers": [("Invitations, per 100", "fixed", 90, 320)],
    "Favor Tags & Packaging Print": [("Favor tags & packaging", "fixed", 60, 240)],
    "Invitation Designers/Printers & Favors": [("Invitations & favors set", "fixed", 120, 420)],
}

CITY_ALIASES = {
    "Skopje (s. Arnakija)": "Skopje",
    "Skopje (s. Petrovec)": "Skopje",
    "Skopje (Saraj)": "Skopje",
    "Bitola (s. Dihovo)": "Bitola",
    "Tetovo (s. Semseevo)": "Tetovo",
    "Tetovo (s. Dobroste)": "Tetovo",
}


def stable_rand(key, lo, hi):
    """Deterministic value in [lo, hi] derived from a key, so re-seeds match."""
    digest = hashlib.sha256(key.encode("utf-8")).digest()
    span = hi - lo
    if span <= 0:
        return lo
    return lo + (int.from_bytes(digest[:4], "big") % (span + 1))


class Command(BaseCommand):
    help = "Import the vendor research sheet into the catalog (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush-demo",
            action="store_true",
            help="Remove the old 8-vendor demo set first.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["flush_demo"]:
            self.flush_demo()
        rows = json.loads((SEED_DIR / "vendors.json").read_text("utf-8"))
        manifest = json.loads((SEED_DIR / "media" / "manifest.json").read_text("utf-8"))

        created = updated = skipped = 0
        for row in rows:
            name = (row.get("Vendor Name") or "").strip()
            sub = (row.get("Subcategory") or "").strip()
            if not name or sub not in CATEGORY_MAP:
                skipped += 1
                continue

            slug = slugify(name)[:220] or slugify(f"{sub}-{skipped}")
            location = self.location_for(row.get("City"))
            category = self.category_for(sub)

            vendor, was_created = Vendor.objects.update_or_create(
                slug=slug,
                defaults=dict(
                    name=name,
                    description=(row.get("Source Notes") or "").strip(),
                    address=(row.get("Address") or "").strip()[:255],
                    business_type=Vendor.BusinessType.COMPANY,
                    status=Vendor.Status.ACTIVE,
                    location=location,
                    google_rating=self.decimal(row.get("Google Rating")),
                    google_review_count=self.integer(row.get("Google Review Count")),
                ),
            )
            created += was_created
            updated += not was_created
            vendor.categories.set([category, category.parent] if category.parent else [category])

            self.attach_contact(vendor, row)
            self.attach_media(vendor, sub, manifest)
            self.attach_offers(vendor, sub, category)

        self.stdout.write(
            self.style.SUCCESS(
                f"Catalog seeded from sheet: {created} created, {updated} updated, "
                f"{skipped} skipped. {Vendor.objects.count()} vendors total, "
                f"{Offer.objects.count()} offers, "
                f"{Vendor.objects.exclude(google_rating=None).count()} with Google ratings."
            )
        )

    # -- helpers -------------------------------------------------------------

    def flush_demo(self):
        """Drop the invented demo vendors; the sheet supersedes them.

        seed_demo stays available as a test fixture -- it's the only seed that
        exercises every pricing path -- but its vendors shouldn't show up in a
        catalog that now has real ones.
        """
        from vendors.management.commands.seed_demo import DEMO

        slugs = [entry["slug"] for entry in DEMO]
        deleted, _ = Vendor.objects.filter(slug__in=slugs).delete()
        if deleted:
            self.stdout.write(f"Removed {deleted} demo catalog rows.")

    def location_for(self, raw_city):
        city = CITY_ALIASES.get((raw_city or "").strip(), (raw_city or "").strip())
        if not city:
            return None
        location = Location.objects.filter(slug=slugify(city)).first()
        if location:
            return location
        return Location.objects.create(
            name=city, slug=slugify(city), display_order=99
        )

    def category_for(self, sub):
        top_name, sub_name = CATEGORY_MAP[sub]
        return Category.objects.get(slug=slugify(f"{top_name}-{sub_name}"))

    def attach_contact(self, vendor, row):
        web = (row.get("Website Or Social") or "").strip()
        parts = [p.strip() for p in web.split("/") if p.strip()]
        website = next(
            (
                f"https://{p}"
                for p in parts
                if "." in p and "facebook" not in p and "instagram" not in p
            ),
            "",
        )
        facebook = next((p for p in parts if "facebook" in p.lower()), "")
        instagram = next((p for p in parts if "instagram" in p.lower()), "")
        Contact.objects.update_or_create(
            vendor=vendor,
            defaults=dict(
                phone=(row.get("Phone") or "").strip()[:40],
                website=website[:200],
                facebook=facebook[:120],
                instagram=instagram[:120],
            ),
        )

    def attach_media(self, vendor, sub, manifest):
        theme = PLACE_PHOTOS.get(vendor.slug) or THEME_MAP.get(sub)
        entry = manifest.get(theme)
        if not entry:
            return
        source = SEED_DIR / "media" / entry["file"]
        if not source.exists():
            return
        target_rel = f"vendors/{entry['file']}"
        target_abs = Path(settings.MEDIA_ROOT) / target_rel
        target_abs.parent.mkdir(parents=True, exist_ok=True)
        if not target_abs.exists():
            shutil.copyfile(source, target_abs)
        Media.objects.update_or_create(
            vendor=vendor,
            is_cover_photo=True,
            defaults=dict(
                media_type=Media.MediaType.IMAGE,
                image=target_rel,
                caption=vendor.name,
                credit=entry.get("credit", ""),
                credit_url=entry.get("credit_url", ""),
                display_order=0,
            ),
        )

    def attach_offers(self, vendor, sub, category):
        for index, (label, price_type, lo, hi) in enumerate(
            OFFER_TEMPLATES.get(sub, [])
        ):
            key = f"{vendor.slug}:{label}"
            value = stable_rand(key, lo, hi)
            defaults = dict(
                description="Indicative package price for planning purposes.",
                price_currency=Offer.Currency.EUR,
                price_type=price_type,
                display_order=index,
                is_active=True,
            )
            if price_type == "per_guest":
                defaults["price_per_guest"] = Decimal(value)
                defaults["min_guest_count"] = 50
            elif price_type == "tiered_per_guest":
                defaults["min_guest_count"] = 60
                defaults["min_capacity"] = 40
                defaults["max_capacity"] = stable_rand(key + ":cap", 150, 400)
            else:
                defaults["price_amount"] = Decimal(value)

            offer, _ = Offer.objects.update_or_create(
                vendor=vendor, name=label, defaults=defaults
            )
            offer.categories.set([category])

            if price_type == "tiered_per_guest":
                offer.price_tiers.all().delete()
                top = value
                brackets = [
                    (40, 100, top),
                    (101, 180, max(top - 4, 12)),
                    (181, None, max(top - 7, 10)),
                ]
                for guests_from, guests_to, per_guest in brackets:
                    OfferPriceTier.objects.create(
                        offer=offer,
                        guests_from=guests_from,
                        guests_to=guests_to,
                        price_per_guest=Decimal(per_guest),
                    )

    @staticmethod
    def decimal(value):
        try:
            return Decimal(str(value)) if value not in (None, "") else None
        except Exception:
            return None

    @staticmethod
    def integer(value):
        try:
            return int(value) if value not in (None, "") else None
        except Exception:
            return None
