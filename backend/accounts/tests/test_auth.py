import pytest
from rest_framework.test import APIClient


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
