import os

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse, HttpResponseNotFound
from django.urls import include, path, re_path
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import IsAuthenticated

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("config.api_router")),
    path("api/auth/", include("accounts.urls")),
    path(
        "api/schema/",
        SpectacularAPIView.as_view(permission_classes=[IsAuthenticated]),
        name="schema",
    ),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(
            url_name="schema",
            permission_classes=[IsAuthenticated],
        ),
        name="swagger-ui",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Serve user-uploaded media in the single-service production deploy.
    # (The seeded demo uses external image URLs, so this only matters for
    # images uploaded via the admin.)
    urlpatterns += [
        re_path(
            r"^media/(?P<path>.*)$",
            serve,
            {"document_root": settings.MEDIA_ROOT},
        )
    ]


# Single-service deploy: WhiteNoise serves the built SPA's hashed assets from
# WHITENOISE_ROOT; this catch-all returns index.html for any non-API/admin/media
# path so client-side (react-router) deep links resolve.
def spa_index(request, *args, **kwargs):
    index = os.path.join(settings.WHITENOISE_ROOT, "index.html")
    if settings.WHITENOISE_ROOT and os.path.exists(index):
        return FileResponse(open(index, "rb"))
    return HttpResponseNotFound("Frontend build not found.")


if settings.WHITENOISE_ROOT:
    urlpatterns += [
        re_path(r"^(?!api/|admin/|media/|static/).*$", spa_index),
    ]
