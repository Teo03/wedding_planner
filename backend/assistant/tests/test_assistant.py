import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from assistant import intent


@pytest.fixture
def seeded(db):
    call_command("seed_taxonomy")
    call_command("seed_locations")
    call_command("seed_catalog")


@pytest.fixture
def api(db):
    user = get_user_model().objects.create_user(
        username="chatter", email="chatter@example.com", password="StrongPassword12345"
    )
    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}"
    )
    return client


def ask(api, message, **extra):
    return api.post("/api/assistant/chat/", {"message": message, **extra}, format="json")


@pytest.mark.django_db
def test_chat_requires_authentication(seeded):
    assert APIClient().post(
        "/api/assistant/chat/", {"message": "hi"}, format="json"
    ).status_code == 401


@pytest.mark.django_db
def test_empty_message_rejected(seeded, api):
    assert ask(api, "   ").status_code == 400


@pytest.mark.django_db
def test_answers_without_a_model_configured(seeded, api, settings):
    settings.LLM_API_KEY = ""
    response = ask(api, "photographers in Skopje")
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "catalog"       # no model, still a real answer
    assert data["vendors"], "retrieval returned nothing"
    assert data["answer"]


@pytest.mark.django_db
def test_every_named_vendor_exists_in_the_catalog(seeded, api, settings):
    """The whole point of grounding: no invented businesses."""
    from vendors.models import Vendor

    settings.LLM_API_KEY = ""
    data = ask(api, "best venues in Ohrid").json()
    slugs = set(Vendor.objects.values_list("slug", flat=True))
    for vendor in data["vendors"]:
        assert vendor["slug"] in slugs


@pytest.mark.django_db
def test_budget_question_builds_a_plan(seeded, api, settings):
    settings.LLM_API_KEY = ""
    data = ask(api, "plan a wedding for 120 guests with a budget of 8000 EUR").json()
    plan = data["plan"]
    assert plan is not None
    assert plan["guests"] == 120
    assert plan["budget_eur"] == 8000
    assert plan["lines"], "plan had no line items"
    # Totals must be the sum of the lines, not a number the assistant made up.
    assert round(sum(l["estimated_eur"] for l in plan["lines"]), 2) == plan["total_eur"]
    assert plan["remaining_eur"] == pytest.approx(8000 - plan["total_eur"], abs=0.01)


@pytest.mark.django_db
def test_plan_covers_distinct_categories(seeded, api, settings):
    settings.LLM_API_KEY = ""
    plan = ask(api, "budget 10000 eur for 100 guests").json()["plan"]
    slugs = [line["category_slug"] for line in plan["lines"]]
    assert len(slugs) == len(set(slugs)), "same category proposed twice"
    assert len(slugs) >= 5


@pytest.mark.django_db
def test_model_failure_falls_back_to_the_catalog_answer(seeded, api, settings, monkeypatch):
    """A dead model endpoint must not take the chat down."""
    settings.LLM_API_KEY = "configured-but-broken"
    monkeypatch.setattr("assistant.llm.complete", lambda *a, **k: None)
    response = ask(api, "photographers in Skopje")
    assert response.status_code == 200
    assert response.json()["source"] == "catalog"
    assert response.json()["answer"]


# -- intent parsing ---------------------------------------------------------


@pytest.mark.django_db
@pytest.mark.parametrize(
    "message,expected",
    [
        ("photographers in Skopje", "photography-video"),
        ("фотограф во Скопје", "photography-video"),
        ("I need a venue", "venues"),
        ("сакам сала за свадба", "venues"),
        ("wedding dress shops", "attire"),
        ("венчаница", "attire"),
    ],
)
def test_category_detected_in_both_languages(seeded, message, expected):
    assert intent.parse(message)["category"] == expected


@pytest.mark.django_db
@pytest.mark.parametrize(
    "message,slug", [("venues in Ohrid", "ohrid"), ("сала во Битола", "bitola")]
)
def test_city_detected_in_both_languages(seeded, message, slug):
    assert intent.parse(message)["city"] == slug


@pytest.mark.django_db
@pytest.mark.parametrize(
    "message,amount,currency",
    [
        ("budget of 8000 EUR", 8000, "EUR"),
        ("буџет од 500000 ден", 500000, "MKD"),
        ("my budget is 12k", 12000, "EUR"),
    ],
)
def test_budget_parsed(seeded, message, amount, currency):
    budget = intent.parse(message)["budget"]
    assert budget == {"amount": amount, "currency": currency}


@pytest.mark.django_db
def test_guest_count_is_not_mistaken_for_a_budget(seeded):
    parsed = intent.parse("a venue for 150 guests")
    assert parsed["guests"] == 150
    assert parsed["budget"] is None
