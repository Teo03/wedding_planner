"""Seed a small set of demo vendors covering every pricing path (idempotent).

Depends on seed_taxonomy + seed_locations having run first.
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from catalog.models import Category, Offer, OfferPriceTier
from locations.models import Location
from media.models import Media
from vendors.models import Contact, Vendor


def cat(parent_name, sub_name):
    return Category.objects.get(slug=slugify(f"{parent_name}-{sub_name}"))


def img(seed):
    return f"https://picsum.photos/seed/{seed}/900/600"


DEMO = [
    {
        "slug": "kamnik-wedding-hall",
        "name": "Kamnik Wedding Hall",
        "city": "skopje",
        "business_type": "company",
        "founded_year": 2011,
        "description": "Large banquet hall on the edge of Skopje with in-house "
        "catering, parking and a garden for the ceremony.",
        "categories": [("Venues", "Wedding Hall / Banquet Hall")],
        "contact": {
            "phone": "+389 70 111 222",
            "viber": "+389 70 111 222",
            "email": "info@kamnikhall.mk",
            "instagram": "kamnik_hall",
        },
        "offers": [
            {
                "name": "All-Inclusive Reception",
                "description": "Venue, plated dinner, drinks and basic decor. "
                "Rate per guest drops as the headcount grows.",
                "categories": [
                    ("Venues", "Wedding Hall / Banquet Hall"),
                    ("Catering & Food", "Catering Companies"),
                ],
                "price_type": "tiered_per_guest",
                "price_currency": "EUR",
                "min_guest_count": 80,
                "min_capacity": 50,
                "max_capacity": 300,
                "attributes": {"has_parking": True, "indoor": True},
                "tiers": [(50, 100, 35), (101, 150, 32), (151, None, 28)],
            }
        ],
    },
    {
        "slug": "villa-biljana-ohrid",
        "name": "Villa Biljana",
        "city": "ohrid",
        "business_type": "company",
        "founded_year": 2018,
        "description": "Private lakeside villa above Ohrid for intimate "
        "destination weddings, ceremony and reception on the terrace.",
        "categories": [
            ("Venues", "Outdoor Venue"),
            ("Venues", "Villa / Private Estate"),
        ],
        "contact": {
            "phone": "+389 71 555 010",
            "whatsapp": "+389 71 555 010",
            "email": "book@villabiljana.mk",
            "website": "https://villabiljana.mk",
            "instagram": "villa.biljana",
        },
        "offers": [
            {
                "name": "Lakeside Garden Package",
                "description": "Exclusive use of the villa terrace and garden "
                "with a flat per-guest price.",
                "categories": [("Venues", "Outdoor Venue")],
                "price_type": "per_guest",
                "price_currency": "EUR",
                "price_per_guest": 45,
                "min_guest_count": 60,
                "min_capacity": 40,
                "max_capacity": 180,
                "attributes": {"outdoor": True, "view": "lake"},
            }
        ],
    },
    {
        "slug": "studio-lumiere",
        "name": "Studio Lumière",
        "city": "skopje",
        "business_type": "company",
        "founded_year": 2015,
        "description": "Photo and video studio covering weddings across the "
        "whole country. Fixed all-day packages.",
        "categories": [
            ("Photography & Video", "Photographers"),
            ("Photography & Video", "Videographers"),
        ],
        "contact": {
            "phone": "+389 78 222 333",
            "email": "hello@studiolumiere.mk",
            "instagram": "studio.lumiere.mk",
        },
        "offers": [
            {
                "name": "Full-Day Photography",
                "description": "12 hours of coverage, two photographers, "
                "edited gallery of 600+ photos.",
                "categories": [("Photography & Video", "Photographers")],
                "price_type": "fixed",
                "price_currency": "EUR",
                "price_amount": 900,
                "attributes": {"style": ["documentary", "editorial"], "hours": 12},
            },
            {
                "name": "Cinematic Wedding Film",
                "description": "Highlight film plus full ceremony edit.",
                "categories": [("Photography & Video", "Videographers")],
                "price_type": "fixed",
                "price_currency": "EUR",
                "price_amount": 1100,
            },
        ],
    },
    {
        "slug": "bon-appetit-catering",
        "name": "Bon Appétit Catering",
        "city": "bitola",
        "business_type": "company",
        "founded_year": 2009,
        "description": "Independent caterer serving Bitola and Pelagonia. "
        "Plated and buffet menus with a 100-guest minimum.",
        "categories": [("Catering & Food", "Catering Companies")],
        "contact": {
            "phone": "+389 75 909 909",
            "viber": "+389 75 909 909",
            "email": "orders@bonappetit.mk",
        },
        "offers": [
            {
                "name": "Plated Dinner Menu",
                "description": "Three-course plated dinner, staff included.",
                "categories": [("Catering & Food", "Catering Companies")],
                "price_type": "per_guest",
                "price_currency": "EUR",
                "price_per_guest": 30,
                "min_guest_count": 100,
            }
        ],
    },
    {
        "slug": "dj-marko",
        "name": "DJ Marko",
        "city": "skopje",
        "business_type": "individual",
        "description": "Wedding DJ and MC, full sound and lighting rig.",
        "categories": [("Entertainment", "DJs")],
        "contact": {
            "phone": "+389 72 400 400",
            "whatsapp": "+389 72 400 400",
            "instagram": "djmarko.mk",
        },
        "offers": [
            {
                "name": "Wedding DJ Set",
                "description": "Sound, lights and MC. Billed per hour.",
                "categories": [("Entertainment", "DJs")],
                "price_type": "per_hour",
                "price_currency": "EUR",
                "price_amount": 120,
            }
        ],
    },
    {
        "slug": "tambura-orkestar-vardar",
        "name": "Tambura Orkestar Vardar",
        "city": "veles",
        "business_type": "company",
        "description": "Six-piece traditional folklore orchestra for the "
        "ceremony and the first hours of the reception.",
        "categories": [("Entertainment", "Traditional/Folklore Orchestras")],
        "contact": {
            "phone": "+389 76 313 313",
            "email": "vardar.orkestar@gmail.com",
        },
        "offers": [
            {
                "name": "Live Folklore Set",
                "description": "Traditional Macedonian repertoire, billed per hour.",
                "categories": [
                    ("Entertainment", "Traditional/Folklore Orchestras")
                ],
                "price_type": "per_hour",
                "price_currency": "EUR",
                "price_amount": 200,
                "attributes": {"members": 6},
            }
        ],
    },
    {
        "slug": "rose-and-ivy-florals",
        "name": "Rose & Ivy Florals",
        "city": "ohrid",
        "business_type": "company",
        "description": "Florist and decorator for ceremony arches, centerpieces "
        "and bouquets.",
        "categories": [("Decor & Flowers", "Florists")],
        "contact": {
            "phone": "+389 70 808 080",
            "instagram": "roseandivy.mk",
        },
        "offers": [
            {
                "name": "Ceremony + Reception Florals",
                "description": "Bridal bouquet, arch, and table centerpieces. "
                "Starting price scales with the number of tables.",
                "categories": [("Decor & Flowers", "Florists")],
                "price_type": "starting_at",
                "price_currency": "EUR",
                "price_amount": 600,
            }
        ],
    },
    {
        "slug": "sweet-layers",
        "name": "Sweet Layers",
        "city": "skopje",
        "business_type": "individual",
        "description": "Custom wedding cakes and dessert tables.",
        "categories": [("Catering & Food", "Cake & Dessert")],
        "contact": {
            "phone": "+389 71 246 810",
            "instagram": "sweetlayers.mk",
        },
        "offers": [
            {
                "name": "Custom Wedding Cake",
                "description": "Three-tier custom cake. Price starts here and "
                "depends on design and servings.",
                "categories": [("Catering & Food", "Cake & Dessert")],
                "price_type": "starting_at",
                "price_currency": "EUR",
                "price_amount": 150,
            }
        ],
    },
]


class Command(BaseCommand):
    help = "Seed demo vendors, offers, contacts and media (idempotent)."

    def handle(self, *args, **options):
        for data in DEMO:
            self._seed_vendor(data)
        self.stdout.write(
            self.style.SUCCESS(
                f"Demo data seeded: {Vendor.objects.count()} vendors, "
                f"{Offer.objects.count()} offers."
            )
        )

    def _seed_vendor(self, data):
        location = Location.objects.get(slug=data["city"])
        vendor, _ = Vendor.objects.update_or_create(
            slug=data["slug"],
            defaults=dict(
                name=data["name"],
                description=data["description"],
                business_type=data.get("business_type", "company"),
                founded_year=data.get("founded_year"),
                status=Vendor.Status.ACTIVE,
                location=location,
            ),
        )
        vendor.categories.set([cat(p, s) for p, s in data["categories"]])

        Contact.objects.update_or_create(
            vendor=vendor, defaults=data.get("contact", {})
        )

        # Cover photo for the vendor.
        Media.objects.update_or_create(
            vendor=vendor,
            caption=f"{data['name']} cover",
            offer=None,
            defaults=dict(
                media_type=Media.MediaType.IMAGE,
                external_url=img(data["slug"]),
                is_cover_photo=True,
                display_order=0,
            ),
        )

        for order, offer_data in enumerate(data["offers"]):
            self._seed_offer(vendor, order, offer_data)

    def _seed_offer(self, vendor, order, offer_data):
        # Read (do not pop) so the module-level DEMO is never mutated; the
        # test suite reseeds many times within a single process.
        tiers = offer_data.get("tiers")
        categories = offer_data.get("categories", [])
        defaults = {
            "description": offer_data.get("description", ""),
            "price_currency": offer_data.get("price_currency", "EUR"),
            "price_type": offer_data["price_type"],
            "price_amount": _dec(offer_data.get("price_amount")),
            "price_per_guest": _dec(offer_data.get("price_per_guest")),
            "min_guest_count": offer_data.get("min_guest_count"),
            "min_capacity": offer_data.get("min_capacity"),
            "max_capacity": offer_data.get("max_capacity"),
            "attributes": offer_data.get("attributes", {}),
            "display_order": order,
            "is_active": True,
        }
        offer, _ = Offer.objects.update_or_create(
            vendor=vendor, name=offer_data["name"], defaults=defaults
        )
        offer.categories.set([cat(p, s) for p, s in categories])

        offer.price_tiers.all().delete()
        if tiers:
            for guests_from, guests_to, rate in tiers:
                OfferPriceTier.objects.create(
                    offer=offer,
                    guests_from=guests_from,
                    guests_to=guests_to,
                    price_per_guest=Decimal(str(rate)),
                )


def _dec(value):
    return Decimal(str(value)) if value is not None else None
