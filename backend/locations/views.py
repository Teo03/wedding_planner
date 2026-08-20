from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from .models import Location, Region


@require_GET
def location_list(request):
    locations = Location.objects.select_related("region").all()
    return JsonResponse([serialize_location(location) for location in locations], safe=False)


@require_GET
def location_detail(request, slug):
    location = get_object_or_404(Location.objects.select_related("region"), slug=slug)
    return JsonResponse(serialize_location(location))


@require_GET
def region_list(request):
    regions = Region.objects.all()
    return JsonResponse([serialize_region(region) for region in regions], safe=False)


@require_GET
def region_detail(request, slug):
    region = get_object_or_404(Region, slug=slug)
    return JsonResponse(serialize_region(region))


def serialize_region(region):
    if region is None:
        return None
    return {
        "id": region.id,
        "name": region.name,
        "slug": region.slug,
        "description": region.description,
    }


def serialize_location(location):
    return {
        "id": location.id,
        "name": location.name,
        "slug": location.slug,
        "region": serialize_region(location.region),
        "latitude": str(location.latitude) if location.latitude is not None else None,
        "longitude": str(location.longitude) if location.longitude is not None else None,
    }
