from rest_framework import viewsets

from .models import Location, Region
from .serializers import LocationSerializer, RegionSerializer


class LocationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Location.objects.select_related("region").all()
    serializer_class = LocationSerializer
    lookup_field = "slug"
    pagination_class = None


class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    lookup_field = "slug"
    pagination_class = None
