import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from catalog.models import Offer


@pytest.fixture
def seeded(db):
    call_command("seed_taxonomy")
    call_command("seed_locations")
    call_command("seed_demo")


@pytest.fixture
def api():
    return APIClient()


@pytest.mark.django_db
def test_top_level_category_filter_includes_subcategories(seeded, api):
    resp = api.get("/api/vendors/?category=venues")
    assert resp.status_code == 200
    names = {v["name"] for v in resp.json()["results"]}
    assert "Kamnik Wedding Hall" in names
    assert "Villa Biljana" in names


@pytest.mark.django_db
def test_subcategory_filter(seeded, api):
    resp = api.get("/api/vendors/?category=photography-video-photographers")
    names = [v["name"] for v in resp.json()["results"]]
    assert names == ["Studio Lumière"]


@pytest.mark.django_db
def test_city_filter(seeded, api):
    resp = api.get("/api/vendors/?city=ohrid")
    names = {v["name"] for v in resp.json()["results"]}
    assert names == {"Villa Biljana", "Rose & Ivy Florals"}


@pytest.mark.django_db
def test_price_range_filter_max(seeded, api):
    resp = api.get("/api/vendors/?max_price=200")
    names = {v["name"] for v in resp.json()["results"]}
    assert "DJ Marko" in names  # 120
    assert "Sweet Layers" in names  # 150
    assert "Studio Lumière" not in names  # from 900


@pytest.mark.django_db
def test_full_text_search(seeded, api):
    resp = api.get("/api/vendors/?search=lakeside")
    names = [v["name"] for v in resp.json()["results"]]
    assert "Villa Biljana" in names


@pytest.mark.django_db
def test_estimate_endpoint_tiered(seeded, api):
    offer = Offer.objects.get(name="All-Inclusive Reception")
    resp = api.get(f"/api/offers/{offer.id}/estimate/?guests=120")
    data = resp.json()
    assert data["unit_price"] == "32.00"
    assert data["total"] == "3840.00"


@pytest.mark.django_db
def test_estimate_endpoint_applies_minimum(seeded, api):
    offer = Offer.objects.get(name="Plated Dinner Menu")  # per_guest 30, min 100
    resp = api.get(f"/api/offers/{offer.id}/estimate/?guests=80")
    data = resp.json()
    assert data["min_guest_applied"] is True
    assert data["total"] == "3000.00"


@pytest.mark.django_db
def test_vendor_detail_is_nested(seeded, api):
    resp = api.get("/api/vendors/kamnik-wedding-hall/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["contact"]["phone"]
    assert len(data["offers"]) == 1
    assert data["offers"][0]["price_tiers"]
    assert data["categories"]


@pytest.mark.django_db
def test_vendor_with_no_offers_still_serializes(seeded, api):
    from locations.models import Location
    from vendors.models import Vendor

    Vendor.objects.create(
        name="Empty Vendor",
        slug="empty-vendor",
        location=Location.objects.get(slug="skopje"),
    )
    resp = api.get("/api/vendors/empty-vendor/")
    assert resp.status_code == 200
    assert resp.json()["offers"] == []


@pytest.mark.django_db
def test_category_tree_endpoint(seeded, api):
    resp = api.get("/api/categories/")
    data = resp.json()
    assert len(data) == 14  # top-level categories
    venues = next(c for c in data if c["slug"] == "venues")
    assert len(venues["children"]) == 5
