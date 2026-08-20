from django.conf import settings
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return response_with_auth_cookies(
            response,
            access=response.data.pop("access"),
            refresh=response.data.pop("refresh"),
        )


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "user": UserSerializer(user).data,
            },
            status=201,
        )
        return response_with_auth_cookies(
            response,
            access=str(refresh.access_token),
            refresh=str(refresh),
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class RefreshCookieView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw_refresh = request.COOKIES.get(REFRESH_COOKIE)
        if not raw_refresh:
            raise InvalidToken("No refresh token cookie was provided.")

        try:
            refresh = RefreshToken(raw_refresh)
        except TokenError as exc:
            raise InvalidToken(str(exc)) from exc

        response = Response({"detail": "Session refreshed."})
        return response_with_auth_cookies(
            response,
            access=str(refresh.access_token),
            refresh=str(refresh),
        )


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"detail": "Signed out."})
        response.delete_cookie(ACCESS_COOKIE, path="/api/")
        response.delete_cookie(REFRESH_COOKIE, path="/api/auth/")
        return response


def response_with_auth_cookies(response, access, refresh):
    response.set_cookie(
        ACCESS_COOKIE,
        access,
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        path="/api/",
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        path="/api/auth/",
    )
    return response
