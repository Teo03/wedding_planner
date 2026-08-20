from django.urls import path

from .views import LoginView, LogoutView, MeView, RefreshCookieView, RegisterView

urlpatterns = [
    path("login/", LoginView.as_view(), name="token-obtain-pair"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("refresh/", RefreshCookieView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
]
