from decimal import Decimal

import pytest

from catalog.models import Offer, OfferPriceTier
from catalog.pricing import estimate_offer
from vendors.models import Vendor


@pytest.fixture
def vendor(db):
    return Vendor.objects.create(name="Test Vendor", slug="test-vendor")


def make_offer(vendor, **kwargs):
    name = kwargs.pop("name", "Offer")
    return Offer.objects.create(vendor=vendor, name=name, **kwargs)


@pytest.mark.django_db
def test_fixed_price_ignores_guests(vendor):
    offer = make_offer(vendor, price_type="fixed", price_amount=Decimal("900"))
    est = estimate_offer(offer, guests=200)
    assert est["total"] == "900.00"
    assert est["guest_dependent"] is False
    assert est["min_guest_applied"] is False


@pytest.mark.django_db
def test_per_guest_multiplies(vendor):
    offer = make_offer(vendor, price_type="per_guest", price_per_guest=Decimal("30"))
    est = estimate_offer(offer, guests=120)
    assert est["effective_guests"] == 120
    assert est["unit_price"] == "30.00"
    assert est["total"] == "3600.00"


@pytest.mark.django_db
def test_per_guest_applies_min_guest_count(vendor):
    offer = make_offer(
        vendor, price_type="per_guest", price_per_guest=Decimal("30"), min_guest_count=100
    )
    est = estimate_offer(offer, guests=80)
    assert est["min_guest_applied"] is True
    assert est["effective_guests"] == 100
    assert est["total"] == "3000.00"  # billed for 100, not 80


@pytest.mark.django_db
def test_per_guest_above_minimum_not_adjusted(vendor):
    offer = make_offer(
        vendor, price_type="per_guest", price_per_guest=Decimal("30"), min_guest_count=100
    )
    est = estimate_offer(offer, guests=150)
    assert est["min_guest_applied"] is False
    assert est["total"] == "4500.00"


@pytest.mark.django_db
def test_tiered_selects_correct_bracket(vendor):
    offer = make_offer(vendor, price_type="tiered_per_guest")
    OfferPriceTier.objects.create(offer=offer, guests_from=50, guests_to=100, price_per_guest=Decimal("35"))
    OfferPriceTier.objects.create(offer=offer, guests_from=101, guests_to=150, price_per_guest=Decimal("32"))
    OfferPriceTier.objects.create(offer=offer, guests_from=151, guests_to=None, price_per_guest=Decimal("28"))
    est = estimate_offer(offer, guests=120)
    assert est["unit_price"] == "32.00"
    assert est["total"] == "3840.00"  # 32 * 120


@pytest.mark.django_db
def test_tiered_open_ended_top_bracket(vendor):
    offer = make_offer(vendor, price_type="tiered_per_guest")
    OfferPriceTier.objects.create(offer=offer, guests_from=151, guests_to=None, price_per_guest=Decimal("28"))
    est = estimate_offer(offer, guests=300)
    assert est["unit_price"] == "28.00"
    assert est["total"] == "8400.00"


@pytest.mark.django_db
def test_tiered_with_min_guest_count(vendor):
    offer = make_offer(vendor, price_type="tiered_per_guest", min_guest_count=80)
    OfferPriceTier.objects.create(offer=offer, guests_from=50, guests_to=100, price_per_guest=Decimal("35"))
    est = estimate_offer(offer, guests=60)
    assert est["min_guest_applied"] is True
    assert est["effective_guests"] == 80
    assert est["unit_price"] == "35.00"
    assert est["total"] == "2800.00"


@pytest.mark.django_db
def test_guest_dependent_without_guest_count_has_no_total(vendor):
    offer = make_offer(vendor, price_type="per_guest", price_per_guest=Decimal("30"))
    est = estimate_offer(offer, guests=None)
    assert est["total"] is None
    assert "guest count" in est["note"].lower()


@pytest.mark.django_db
def test_per_hour_returns_flat_amount(vendor):
    offer = make_offer(vendor, price_type="per_hour", price_amount=Decimal("120"))
    est = estimate_offer(offer, guests=100)
    assert est["total"] == "120.00"
    assert est["guest_dependent"] is False
