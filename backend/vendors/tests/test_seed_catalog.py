"""Smoke coverage for the spreadsheet import.

Guards the mapping tables: an unmapped subcategory silently drops vendors, and
a bad theme key silently drops cover photos -- neither raises on its own.
"""
import pytest
from django.core.management import call_command

from catalog.models import Offer
from media.models import Media
from vendors.management.commands.seed_catalog import (
    CATEGORY_MAP,
    OFFER_TEMPLATES,
)
from vendors.models import Vendor


@pytest.fixture
def imported(db):
    call_command("seed_taxonomy")
    call_command("seed_locations")
    call_command("seed_catalog")


def test_every_mapped_subcategory_has_an_offer_template():
    assert set(CATEGORY_MAP) == set(OFFER_TEMPLATES)


@pytest.mark.django_db
def test_import_loads_the_sheet(imported):
    assert Vendor.objects.count() > 140
    # Google ratings are real data from the sheet and must survive the import.
    rated = Vendor.objects.exclude(google_rating=None)
    assert rated.count() > 30
    assert all(1 <= float(v.google_rating) <= 5 for v in rated)


@pytest.mark.django_db
def test_only_vendors_with_their_own_photo_get_a_cover(imported):
    """No shared stock stand-ins: one picture must not appear on many vendors."""
    from vendors.management.commands.seed_catalog import VENDOR_PHOTO_DIR

    supplied = {p.stem for p in VENDOR_PHOTO_DIR.glob("*.jpg")}
    with_cover = set(
        Media.objects.filter(is_cover_photo=True).values_list("vendor__slug", flat=True)
    )
    assert with_cover <= supplied
    # Every cover image is unique to its vendor.
    images = list(Media.objects.filter(is_cover_photo=True).values_list("image", flat=True))
    assert len(images) == len(set(images))


@pytest.mark.django_db
def test_every_vendor_is_priceable(imported):
    """The plan list can only total vendors that have at least one offer."""
    assert not Vendor.objects.filter(offers__isnull=True).exists()
    assert Offer.objects.filter(price_type="tiered_per_guest", price_tiers=None).count() == 0


@pytest.mark.django_db
def test_import_is_idempotent(imported):
    before = (Vendor.objects.count(), Offer.objects.count(), Media.objects.count())
    call_command("seed_catalog")
    after = (Vendor.objects.count(), Offer.objects.count(), Media.objects.count())
    assert before == after


@pytest.mark.django_db
def test_generated_prices_are_stable_across_reseeds(imported):
    offer = Offer.objects.filter(price_amount__isnull=False).order_by("id").first()
    original = offer.price_amount
    call_command("seed_catalog")
    offer.refresh_from_db()
    assert offer.price_amount == original


@pytest.mark.django_db
def test_vendor_supplied_photo_wins_over_the_category_standin(imported):
    """A real photo of the business should never be replaced by a stock one."""
    from vendors.management.commands.seed_catalog import VENDOR_PHOTO_DIR

    supplied = {p.stem for p in VENDOR_PHOTO_DIR.glob("*.jpg")}
    assert supplied, "expected vendor-supplied photos in seed_data/vendor_photos"

    for slug in sorted(supplied):
        vendor = Vendor.objects.filter(slug=slug).first()
        # Every supplied photo must belong to a vendor that actually exists,
        # otherwise the filename-to-slug mapping has drifted.
        assert vendor is not None, f"no vendor for supplied photo {slug}.jpg"
        cover = vendor.media.filter(is_cover_photo=True).first()
        assert cover is not None
        assert cover.image.name == f"vendors/own-{slug}.jpg"
        # Their own photo needs no third-party attribution.
        assert cover.credit == ""


@pytest.mark.django_db
def test_vendors_without_a_photo_get_none(imported):
    """They fall through to the frontend placeholder rather than a stock image."""
    from vendors.management.commands.seed_catalog import VENDOR_PHOTO_DIR

    supplied = {p.stem for p in VENDOR_PHOTO_DIR.glob("*.jpg")}
    other = Vendor.objects.exclude(slug__in=supplied).first()
    if other is not None:
        assert not other.media.filter(is_cover_photo=True).exists()
