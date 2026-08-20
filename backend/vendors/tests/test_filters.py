import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from reviews.models import Review
from vendors.models import Vendor


@pytest.fixture
def seeded(db):
    call_command("seed_taxonomy")
    call_command("seed_locations")
    call_command("seed_demo")


@pytest.fixture
def api(db):
    user = get_user_model().objects.create_user(
        username="filter-user",
        email="filter-user@example.com",
        password="SufficientlyStrongPassword123",
    )
    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}"
    )
    return client


def names(response):
    return [row["name"] for row in response.json()["results"]]


@pytest.mark.django_db
def test_min_rating_filters_on_google_snapshot(seeded, api):
    Vendor.objects.filter(slug="kamnik-wedding-hall").update(google_rating="4.8")
    Vendor.objects.filter(slug="dj-marko").update(google_rating="3.1")

    high = api.get("/api/vendors/?min_rating=4.5")
    assert "Kamnik Wedding Hall" in names(high)
    assert "DJ Marko" not in names(high)


@pytest.mark.django_db
def test_min_rating_prefers_site_reviews_over_google(seeded, api):
    vendor = Vendor.objects.get(slug="dj-marko")
    vendor.google_rating = "1.2"
    vendor.save()
    author = get_user_model().objects.create_user(
        username="rater", email="rater@example.com", password="StrongPassword12345"
    )
    Review.objects.create(vendor=vendor, author=author, rating=5)

    # The site average (5.0) supersedes the stale Google snapshot (1.2).
    assert "DJ Marko" in names(api.get("/api/vendors/?min_rating=4.5"))


@pytest.mark.django_db
def test_unrated_vendors_are_excluded_by_rated_flag(seeded, api):
    Vendor.objects.filter(slug="kamnik-wedding-hall").update(google_rating="4.0")
    rated = names(api.get("/api/vendors/?rated=1"))
    assert rated == ["Kamnik Wedding Hall"]


@pytest.mark.django_db
def test_rating_ordering_puts_unrated_last(seeded, api):
    Vendor.objects.filter(slug="dj-marko").update(google_rating="3.0")
    Vendor.objects.filter(slug="sweet-layers").update(google_rating="4.9")
    ordered = names(api.get("/api/vendors/?ordering=-rating"))
    assert ordered[0] == "Sweet Layers"
    assert ordered[1] == "DJ Marko"
    # Everything else is unrated and sorts after the rated ones.
    assert len(ordered) > 2


@pytest.mark.django_db
def test_audience_filter_separates_bride_and_groom(seeded, api):
    # seed_demo has no attire vendors, so the filter should simply be empty
    # rather than falling back to "everything".
    assert names(api.get("/api/vendors/?audience=groom")) == []


@pytest.mark.django_db
def test_rating_is_exposed_on_list_rows(seeded, api):
    Vendor.objects.filter(slug="kamnik-wedding-hall").update(
        google_rating="4.4", google_review_count=52
    )
    row = next(
        r
        for r in api.get("/api/vendors/").json()["results"]
        if r["slug"] == "kamnik-wedding-hall"
    )
    assert row["rating"] == 4.4
    assert row["rating_source"] == "google"
    assert row["google_review_count"] == 52
    assert row["site_review_count"] == 0
