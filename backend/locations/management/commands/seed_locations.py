"""Seed North Macedonia cities/municipalities relevant to weddings (idempotent)."""
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from locations.models import Location, Region

REGIONS = {
    "Ohrid-Struga Lake Region": "Lakeside destination-wedding area.",
    "Pelagonia": "Bitola-Prilep plain.",
    "Polog": "Tetovo-Gostivar area.",
    "Vardar": "Central Vardar valley.",
    "Southeastern": "Strumica and surroundings.",
    "Northeastern": "Kumanovo area.",
}

# (city, region name or None, latitude, longitude)
CITIES = [
    ("Skopje", None, 41.9981, 21.4254),
    ("Ohrid", "Ohrid-Struga Lake Region", 41.1231, 20.8016),
    ("Struga", "Ohrid-Struga Lake Region", 41.1775, 20.6781),
    ("Bitola", "Pelagonia", 41.0297, 21.3292),
    ("Prilep", "Pelagonia", 41.3464, 21.5542),
    ("Tetovo", "Polog", 42.0106, 20.9714),
    ("Gostivar", "Polog", 41.7967, 20.9083),
    ("Kumanovo", "Northeastern", 42.1322, 21.7144),
    ("Veles", "Vardar", 41.7156, 21.7756),
    ("Kavadarci", "Vardar", 41.4331, 22.0119),
    ("Strumica", "Southeastern", 41.4378, 22.6425),
]


class Command(BaseCommand):
    help = "Seed North Macedonia locations and regions (idempotent)."

    def handle(self, *args, **options):
        for region_name, desc in REGIONS.items():
            Region.objects.update_or_create(
                slug=slugify(region_name),
                defaults=dict(name=region_name, description=desc),
            )

        for order, (city, region_name, lat, lng) in enumerate(CITIES):
            region = None
            if region_name:
                region = Region.objects.get(slug=slugify(region_name))
            Location.objects.update_or_create(
                slug=slugify(city),
                defaults=dict(
                    name=city,
                    region=region,
                    latitude=lat,
                    longitude=lng,
                    display_order=order,
                ),
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Locations seeded: {Location.objects.count()} cities, "
                f"{Region.objects.count()} regions."
            )
        )
