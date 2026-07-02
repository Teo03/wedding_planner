from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .filters import OfferFilter
from .models import Category, Offer
from .pricing import estimate_offer
from .serializers import CategorySerializer, OfferSerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorySerializer
    lookup_field = "slug"
    pagination_class = None

    def get_queryset(self):
        qs = Category.objects.prefetch_related("children")
        # List returns top-level categories (with nested children) by default.
        if self.action == "list" and self.request.query_params.get("all") != "1":
            qs = qs.filter(parent__isnull=True)
        return qs


class OfferViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OfferSerializer
    filterset_class = OfferFilter

    def get_queryset(self):
        return (
            Offer.objects.filter(is_active=True)
            .select_related("vendor")
            .prefetch_related("categories", "price_tiers")
        )

    @action(detail=True, methods=["get"])
    def estimate(self, request, pk=None):
        """GET /api/offers/{id}/estimate/?guests=120 -> priced estimate."""
        offer = self.get_object()
        raw = request.query_params.get("guests")
        guests = int(raw) if raw and raw.isdigit() else None
        return Response(estimate_offer(offer, guests))
