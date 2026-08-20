import pytest
from django.core.management import call_command

from catalog.models import Category


@pytest.fixture
def taxonomy(db):
    call_command("seed_taxonomy")


@pytest.mark.django_db
def test_every_category_has_a_macedonian_name(taxonomy):
    """MK is the default language, so an untranslated row is a visible gap."""
    missing = Category.objects.filter(name_mk="").values_list("name", flat=True)
    assert list(missing) == []


@pytest.mark.django_db
def test_reseed_prunes_categories_dropped_from_the_taxonomy(taxonomy):
    Category.objects.create(name="Retired", name_mk="Стар", slug="retired-thing")
    call_command("seed_taxonomy")
    assert not Category.objects.filter(slug="retired-thing").exists()


@pytest.mark.django_db
def test_prune_keeps_categories_that_still_have_vendors(taxonomy):
    """Deleting one of these would silently detach live listings."""
    from vendors.models import Vendor

    stale = Category.objects.create(name="Retired", slug="retired-thing")
    vendor = Vendor.objects.create(name="Somebody", slug="somebody")
    vendor.categories.add(stale)

    call_command("seed_taxonomy")
    assert Category.objects.filter(slug="retired-thing").exists()


@pytest.mark.django_db
def test_audience_defaults_to_couple(taxonomy):
    venues = Category.objects.get(slug="venues")
    assert venues.audience == Category.Audience.COUPLE
    assert (
        Category.objects.get(slug="attire-wedding-dress-shops").audience == "bride"
    )
