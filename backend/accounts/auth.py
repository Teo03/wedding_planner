from functools import wraps

from django.http import JsonResponse
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            raw_token = request.COOKIES.get("access_token")

        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token


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
