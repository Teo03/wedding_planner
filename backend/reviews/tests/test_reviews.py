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


def client_for(username):
    user = get_user_model().objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="SufficientlyStrongPassword123",
    )
    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}"
    )
    return client, user


@pytest.fixture
def api(db):
    client, _ = client_for("reviewer")
    return client


@pytest.mark.django_db
def test_review_requires_authentication(seeded):
    response = APIClient().post(
        "/api/vendors/kamnik-wedding-hall/reviews/", {"rating": 5}, format="json"
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_create_review_updates_summary(seeded, api):
    response = api.post(
        "/api/vendors/kamnik-wedding-hall/reviews/",
        {"rating": 4, "title": "Great hall", "body": "Plenty of parking."},
        format="json",
    )
    assert response.status_code == 201
    summary = response.json()["summary"]
    assert summary["site_rating"] == 4.0
    assert summary["site_review_count"] == 1
    assert summary["rating_source"] == "site"
    assert summary["histogram"]["4"] == 1


@pytest.mark.django_db
@pytest.mark.parametrize("rating", [0, 6, -1, "abc", None])
def test_rating_must_be_one_to_five(seeded, api, rating):
    response = api.post(
        "/api/vendors/kamnik-wedding-hall/reviews/", {"rating": rating}, format="json"
    )
    assert response.status_code == 400
    assert Review.objects.count() == 0


@pytest.mark.django_db
def test_second_review_by_same_user_replaces_the_first(seeded, api):
    url = "/api/vendors/kamnik-wedding-hall/reviews/"
    assert api.post(url, {"rating": 2}, format="json").status_code == 201
    assert api.post(url, {"rating": 5}, format="json").status_code == 200
    assert Review.objects.count() == 1
    assert api.get(url).json()["summary"]["site_rating"] == 5.0


@pytest.mark.django_db
def test_average_spans_multiple_users(seeded):
    first, _ = client_for("guest-one")
    second, _ = client_for("guest-two")
    url = "/api/vendors/kamnik-wedding-hall/reviews/"
    first.post(url, {"rating": 5}, format="json")
    second.post(url, {"rating": 2}, format="json")
    summary = first.get(url).json()["summary"]
    assert summary["site_rating"] == 3.5
    assert summary["site_review_count"] == 2


@pytest.mark.django_db
def test_delete_removes_only_the_callers_review(seeded):
    first, _ = client_for("owner")
    second, _ = client_for("other")
    url = "/api/vendors/kamnik-wedding-hall/reviews/"
    first.post(url, {"rating": 5}, format="json")
    second.post(url, {"rating": 1}, format="json")
    assert first.delete(url).status_code == 200
    assert Review.objects.count() == 1
    assert Review.objects.first().rating == 1


@pytest.mark.django_db
def test_delete_without_a_review_is_404(seeded, api):
    assert api.delete("/api/vendors/kamnik-wedding-hall/reviews/").status_code == 404


@pytest.mark.django_db
def test_google_rating_is_used_until_a_site_review_exists(seeded, api):
    vendor = Vendor.objects.get(slug="kamnik-wedding-hall")
    vendor.google_rating = "4.6"
    vendor.google_review_count = 88
    vendor.save()

    url = "/api/vendors/kamnik-wedding-hall/reviews/"
    summary = api.get(url).json()["summary"]
    assert summary["rating"] == 4.6
    assert summary["rating_source"] == "google"

    api.post(url, {"rating": 3}, format="json")
    summary = api.get(url).json()["summary"]
    assert summary["rating"] == 3.0
    assert summary["rating_source"] == "site"
    # Google's snapshot is kept alongside, not overwritten.
    assert summary["google_rating"] == 4.6
