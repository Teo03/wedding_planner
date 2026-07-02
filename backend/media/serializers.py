from rest_framework import serializers

from .models import Media


class MediaSerializer(serializers.ModelSerializer):
    url = serializers.CharField(read_only=True)

    class Meta:
        model = Media
        fields = [
            "id",
            "media_type",
            "url",
            "caption",
            "display_order",
            "is_cover_photo",
            "offer",
        ]
