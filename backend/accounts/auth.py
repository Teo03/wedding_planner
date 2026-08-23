from functools import wraps

from django.http import JsonResponse
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class CookieJWTAuthentication(JWTAuthentication):
    """JWT auth that reads the access token from a cookie, falling back to the
    Authorization header.

    A stale cookie is treated as "not signed in" rather than as an error.
    DRF authenticates before it checks permissions, so raising here would 401
    every request -- including AllowAny ones like register and login. That left
    anyone holding an expired cookie, or a cookie for a user that no longer
    exists, permanently unable to sign in or create an account, with no way out
    but clearing cookies by hand. A token supplied explicitly in the header
    still raises, since that is a caller error worth surfacing.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        from_cookie = header is None

        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            raw_token = request.COOKIES.get("access_token")

        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, TokenError, AuthenticationFailed):
            if from_cookie:
                return None
            raise


def jwt_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        authenticator = CookieJWTAuthentication()
        try:
            auth = authenticator.authenticate(request)
        except (AuthenticationFailed, InvalidToken):
            return JsonResponse({"detail": "Invalid or expired token."}, status=401)

        if auth is None:
            return JsonResponse(
                {"detail": "Authentication credentials were not provided."},
                status=401,
            )

        request.user, request.auth = auth
        return view_func(request, *args, **kwargs)

    return wrapper
