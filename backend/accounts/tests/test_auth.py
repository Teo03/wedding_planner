from datetime import timedelta

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


@pytest.fixture
def api():
    return APIClient()


@pytest.mark.django_db
def test_register_returns_tokens_and_user(api):
    resp = api.post(
        "/api/auth/register/",
        {
            "username": "elena",
            "email": "elena@example.com",
            "password": "SufficientlyStrongPassword123",
            "first_name": "Elena",
        },
        format="json",
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["user"]["username"] == "elena"
    assert data["user"]["email"] == "elena@example.com"
    assert "access" not in data
    assert "refresh" not in data
    assert "access_token" in resp.cookies
    assert "refresh_token" in resp.cookies
    assert resp.cookies["access_token"]["httponly"]
    assert resp.cookies["refresh_token"]["httponly"]


@pytest.mark.django_db
def test_login_and_me_with_jwt(api, django_user_model):
    django_user_model.objects.create_user(
        username="marko",
        email="marko@example.com",
        password="SufficientlyStrongPassword123",
    )

    token_resp = api.post(
        "/api/auth/login/",
        {"username": "marko", "password": "SufficientlyStrongPassword123"},
        format="json",
    )
    assert token_resp.status_code == 200
    assert "access" not in token_resp.json()
    assert "refresh" not in token_resp.json()
    assert "access_token" in token_resp.cookies
    assert "refresh_token" in token_resp.cookies

    me_resp = api.get("/api/auth/me/")

    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "marko"


@pytest.mark.django_db
def test_refresh_uses_httponly_cookie(api, django_user_model):
    django_user_model.objects.create_user(
        username="ana",
        email="ana@example.com",
        password="SufficientlyStrongPassword123",
    )
    login_resp = api.post(
        "/api/auth/login/",
        {"username": "ana", "password": "SufficientlyStrongPassword123"},
        format="json",
    )
    assert login_resp.status_code == 200

    refresh_resp = api.post("/api/auth/refresh/")

    assert refresh_resp.status_code == 200
    assert refresh_resp.json() == {"detail": "Session refreshed."}
    assert "access_token" in refresh_resp.cookies
    assert "refresh_token" in refresh_resp.cookies


@pytest.mark.django_db
def test_logout_clears_auth_cookies(api, django_user_model):
    django_user_model.objects.create_user(
        username="logout-user",
        email="logout@example.com",
        password="SufficientlyStrongPassword123",
    )
    api.post(
        "/api/auth/login/",
        {"username": "logout-user", "password": "SufficientlyStrongPassword123"},
        format="json",
    )

    resp = api.post("/api/auth/logout/")

    assert resp.status_code == 200
    assert resp.cookies["access_token"].value == ""
    assert resp.cookies["refresh_token"].value == ""


@pytest.mark.django_db
def test_me_requires_authentication(api):
    resp = api.get("/api/auth/me/")

    assert resp.status_code == 401


# -- stale cookie lockout ---------------------------------------------------
#
# DRF authenticates before it checks permissions, so an unusable cookie used to
# 401 every request -- including register and login, which are AllowAny. Anyone
# holding an expired cookie, or one for a deleted user, was locked out with no
# way to recover except clearing cookies by hand.

STALE_TOKEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzAwMDAwMDAwLCJ1c2VyX2lkIjo5OTk5fQ."
    "invalidsignature"
)


@pytest.mark.django_db
def test_register_works_despite_a_stale_access_cookie():
    client = APIClient()
    client.cookies["access_token"] = STALE_TOKEN
    response = client.post(
        "/api/auth/register/",
        {
            "username": "recovering",
            "email": "recovering@example.com",
            "password": "SufficientlyStrongPassword123",
        },
        format="json",
    )
    assert response.status_code == 201, response.data


@pytest.mark.django_db
def test_login_works_despite_a_stale_access_cookie(django_user_model):
    django_user_model.objects.create_user(
        username="returning",
        email="returning@example.com",
        password="SufficientlyStrongPassword123",
    )
    client = APIClient()
    client.cookies["access_token"] = STALE_TOKEN
    response = client.post(
        "/api/auth/login/",
        {"username": "returning", "password": "SufficientlyStrongPassword123"},
        format="json",
    )
    assert response.status_code == 200, response.data


@pytest.mark.django_db
def test_cookie_for_a_deleted_user_is_treated_as_signed_out(django_user_model):
    """The exact production failure: the database was reset, the cookie wasn't."""
    user = django_user_model.objects.create_user(
        username="vanished",
        email="vanished@example.com",
        password="SufficientlyStrongPassword123",
    )
    token = str(RefreshToken.for_user(user).access_token)
    user.delete()

    client = APIClient()
    client.cookies["access_token"] = token
    # Protected routes say "not signed in" ...
    assert client.get("/api/vendors/").status_code == 401
    # ... but the user can still create a new account to recover.
    assert (
        client.post(
            "/api/auth/register/",
            {
                "username": "vanished2",
                "email": "vanished2@example.com",
                "password": "SufficientlyStrongPassword123",
            },
            format="json",
        ).status_code
        == 201
    )


@pytest.mark.django_db
def test_invalid_bearer_header_still_errors():
    """A bad token sent explicitly is a caller mistake and should surface."""
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {STALE_TOKEN}")
    assert client.get("/api/vendors/").status_code == 401


# -- staying signed in ------------------------------------------------------
#
# The auth cookies originally carried no max_age, which makes them session
# cookies: the browser drops them when it closes, so people came back signed
# out while their refresh token was still valid.


@pytest.mark.django_db
def test_auth_cookies_outlive_the_browser_session(api):
    response = api.post(
        "/api/auth/register/",
        {
            "username": "staysignedin",
            "email": "staysignedin@example.com",
            "password": "SufficientlyStrongPassword123",
        },
        format="json",
    )
    assert response.status_code == 201
    for name in ("access_token", "refresh_token"):
        cookie = response.cookies[name]
        assert cookie["max-age"], f"{name} is a session cookie"
        assert int(cookie["max-age"]) > 0


@pytest.mark.django_db
def test_refresh_token_lasts_well_beyond_a_day(api):
    """simple_jwt's default is one day, which signed people out constantly."""
    from rest_framework_simplejwt.settings import api_settings

    assert api_settings.REFRESH_TOKEN_LIFETIME >= timedelta(days=7)
    response = api.post(
        "/api/auth/register/",
        {
            "username": "longlived",
            "email": "longlived@example.com",
            "password": "SufficientlyStrongPassword123",
        },
        format="json",
    )
    refresh_max_age = int(response.cookies["refresh_token"]["max-age"])
    assert refresh_max_age >= 7 * 24 * 3600
