"""Seed the full wedding vendor category taxonomy (idempotent)."""
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from catalog.models import Category

V = Category.Layout.VENUE
S = Category.Layout.SERVICE
BRIDE = Category.Audience.BRIDE
GROOM = Category.Audience.GROOM
COUPLE = Category.Audience.COUPLE

# (top-level name, layout, icon, [(subcategory name, layout), ...])
TAXONOMY = [
    ("Ceremony & Officiants", S, "\U0001F54A", [
        ("Orthodox Church", S),
        ("Mosque", S),
        ("Catholic Church", S),
        ("Civil Ceremony / Registry Office", S),
        ("Independent/Humanist Officiant", S),
    ]),
    ("Venues", V, "\U0001F3DB", [
        ("Wedding Hall / Banquet Hall", V),
        ("Hotel (with reception space)", V),
        ("Restaurant / Event Space", V),
        ("Outdoor Venue", V),
        ("Villa / Private Estate", V),
    ]),
    ("Catering & Food", S, "\U0001F37D", [
        ("Catering Companies", S),
        ("Cake & Dessert", S),
        ("Bartenders & Drink Service", S),
        ("Chefs (private/specialty)", S),
    ]),
    ("Photography & Video", S, "\U0001F4F8", [
        ("Photographers", S),
        ("Videographers", S),
        ("Drone Operators", S),
        ("Photo/Video Combined Studios", S),
    ]),
    ("Attire", S, "\U0001F457", [
        ("Wedding Dress Shops", S, BRIDE),
        ("Suit/Tux Rental & Menswear", S, GROOM),
        ("Tailors & Alterations", S),
        ("Shoes", S),
        ("Accessories", S, BRIDE),
    ]),
    ("Beauty", S, "\U0001F484", [
        ("Hair Stylists & Makeup", S, BRIDE),
        ("Makeup Artists", S, BRIDE),
        ("Spas / Pre-wedding Treatments", S),
    ]),
    ("Entertainment", S, "\U0001F3B6", [
        ("DJs", S),
        ("Live Bands", S),
        ("Traditional/Folklore Orchestras", S),
        ("Folklore Dance Groups", S),
        ("MC / Wedding Host", S),
        ("Chamber/String Ensembles", S),
        ("Event AV / Lighting & Sound Rental", S),
    ]),
    ("Decor & Flowers", S, "\U0001F490", [
        ("Florists", S),
        ("Decorators", S),
        ("Wedding Decor & Flowers", S),
        ("Balloon Decor", S),
        ("Furniture & Lighting Rental", S),
        ("Tent Rental", V),
    ]),
    ("Print & Stationery", S, "\U0001F48C", [
        ("Invitation Designers/Printers", S),
        ("Seating Charts & Signage", S),
        ("Favor Tags & Packaging Print", S),
    ]),
    ("Rings & Jewelry", S, "\U0001F48D", [
        ("Jewelers", S),
    ]),
    ("Planning Services", S, "\U0001F4CB", [
        ("Full-Service Wedding Planners", S),
        ("Day-of Coordinators", S),
    ]),
    ("Car Rental & Transport", S, "\U0001F697", [
        ("Limousine/Cabriolet Rental", S),
        ("Horse-Drawn Carriage Rental", S),
        ("Rent-a-Car (general)", S),
        ("Guest Shuttle / Minibus", S),
    ]),
    ("Gifts & Favors", S, "\U0001F381", [
        ("Gift Shops", S),
        ("Favor Makers", S),
        ("Cake/Table Decor Add-ons", S),
    ]),
    ("Extra Experiences / Reservations", S, "\U00002728", [
        ("Photobooth", S),
        ("Live Painting", S),
        ("Ice Sculptures / Ice Makers", S),
        ("Champagne Tower", S),
        ("Fireworks / Sparkler Send-off", S),
    ]),
    ("Accommodation (for guests)", V, "\U0001F3E8", [
        ("Hotels", V),
    ]),
]


class Command(BaseCommand):
    help = "Seed the wedding vendor category taxonomy (idempotent)."

    def handle(self, *args, **options):
        for top_order, (name, layout, icon, subs) in enumerate(TAXONOMY):
            parent, _ = Category.objects.update_or_create(
                slug=slugify(name),
                defaults=dict(
                    name=name,
                    parent=None,
                    layout_hint=layout,
                    icon=icon,
                    display_order=top_order,
                ),
            )
            for sub_order, sub in enumerate(subs):
                sub_name, sub_layout = sub[0], sub[1]
                audience = sub[2] if len(sub) > 2 else Category.Audience.COUPLE
                Category.objects.update_or_create(
                    slug=slugify(f"{name}-{sub_name}"),
                    defaults=dict(
                        name=sub_name,
                        parent=parent,
                        layout_hint=sub_layout,
                        audience=audience,
                        display_order=sub_order,
                    ),
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Taxonomy seeded: {Category.objects.filter(parent__isnull=True).count()} "
                f"top-level, {Category.objects.filter(parent__isnull=False).count()} subcategories."
            )
        )
