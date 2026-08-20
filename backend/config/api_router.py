"""Explicit API routes.

These are plain Django URL patterns, not DRF router-generated routes.
"""
from django.http import JsonResponse
from django.urls import path

from accounts.auth import jwt_required
from catalog import views as catalog_views
from locations import views as location_views
from reviews import views as review_views
from vendors import views as vendor_views


def api_root(request):
    return JsonResponse(
        {
            "vendors": request.build_absolute_uri("vendors/"),
            "categories": request.build_absolute_uri("categories/"),
            "offers": request.build_absolute_uri("offers/"),
            "locations": request.build_absolute_uri("locations/"),
            "reviews": request.build_absolute_uri("vendors/<slug>/reviews/"),
            "regions": request.build_absolute_uri("regions/"),
        }
    )


urlpatterns = [
    path("", jwt_required(api_root), name="api-root"),
    path("vendors/", jwt_required(vendor_views.vendor_list), name="vendor-list"),
    path(
        "vendors/<slug:slug>/",
        jwt_required(vendor_views.vendor_detail),
        name="vendor-detail",
    ),
    path(
        "vendors/<slug:slug>/reviews/",
        review_views.VendorReviewsView.as_view(),
        name="vendor-reviews",
    ),
    path("categories/", jwt_required(catalog_views.category_list), name="category-list"),
    path(
        "categories/<slug:slug>/",
        jwt_required(catalog_views.category_detail),
        name="category-detail",
    ),
    path("offers/", jwt_required(catalog_views.offer_list), name="offer-list"),
    path(
        "offers/<int:pk>/",
        jwt_required(catalog_views.offer_detail),
        name="offer-detail",
    ),
    path(
        "offers/<int:pk>/estimate/",
        jwt_required(catalog_views.offer_estimate),
        name="offer-estimate",
    ),
    path("locations/", jwt_required(location_views.location_list), name="location-list"),
    path(
        "locations/<slug:slug>/",
        jwt_required(location_views.location_detail),
        name="location-detail",
    ),
    path("regions/", jwt_required(location_views.region_list), name="region-list"),
    path(
        "regions/<slug:slug>/",
        jwt_required(location_views.region_detail),
        name="region-detail",
    ),
]
