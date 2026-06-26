"""Aggregates every app's DRF viewsets under a single router."""
from rest_framework.routers import DefaultRouter

from catalog.views import CategoryViewSet, OfferViewSet
from locations.views import LocationViewSet, RegionViewSet
from vendors.views import VendorViewSet

router = DefaultRouter()
router.register("vendors", VendorViewSet, basename="vendor")
router.register("categories", CategoryViewSet, basename="category")
router.register("offers", OfferViewSet, basename="offer")
router.register("locations", LocationViewSet, basename="location")
router.register("regions", RegionViewSet, basename="region")

urlpatterns = router.urls
