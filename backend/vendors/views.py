from rest_framework import viewsets

from .filters import VendorFilter
from .models import Vendor
from .serializers import VendorDetailSerializer, VendorListSerializer


class VendorViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = "slug"
    filterset_class = VendorFilter
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return (
            Vendor.objects.select_related(
                "location", "location__region", "contact"
            )
            .prefetch_related(
                "categories",
                "media",
                "offers",
                "offers__categories",
                "offers__price_tiers",
            )
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return VendorDetailSerializer
        return VendorListSerializer
