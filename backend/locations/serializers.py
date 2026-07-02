from rest_framework import serializers

from .models import Location, Region


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ["id", "name", "slug", "description"]


class LocationSerializer(serializers.ModelSerializer):
    region = RegionSerializer(read_only=True)

    class Meta:
        model = Location
        fields = ["id", "name", "slug", "region", "latitude", "longitude"]
