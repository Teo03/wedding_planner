from rest_framework import serializers

from catalog.serializers import CategorySummarySerializer, OfferSerializer
from locations.serializers import LocationSerializer
from media.serializers import MediaSerializer

from .models import Contact, Vendor


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            "phone",
            "viber",
            "whatsapp",
            "email",
            "website",
            "instagram",
            "facebook",
        ]


class VendorListSerializer(serializers.ModelSerializer):
    location = LocationSerializer(read_only=True)
    categories = CategorySummarySerializer(many=True, read_only=True)
    cover_photo = serializers.SerializerMethodField()
    from_price = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = [
            "id",
            "name",
            "slug",
            "business_type",
            "status",
            "location",
            "categories",
            "cover_photo",
            "from_price",
        ]

    def get_cover_photo(self, obj):
        media = list(obj.media.all())
        cover = next((m for m in media if m.is_cover_photo), None)
        cover = cover or (media[0] if media else None)
        return cover.url if cover else None

    def get_from_price(self, obj):
        prices = []
        for offer in obj.offers.all():
            if not offer.is_active:
                continue
            if offer.price_amount is not None:
                prices.append(offer.price_amount)
            elif offer.price_per_guest is not None:
                prices.append(offer.price_per_guest)
        return str(min(prices)) if prices else None


class VendorDetailSerializer(serializers.ModelSerializer):
    location = LocationSerializer(read_only=True)
    categories = CategorySummarySerializer(many=True, read_only=True)
    offers = OfferSerializer(many=True, read_only=True)
    media = MediaSerializer(many=True, read_only=True)
    contact = ContactSerializer(read_only=True)

    class Meta:
        model = Vendor
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "founded_year",
            "business_type",
            "status",
            "location",
            "categories",
            "offers",
            "media",
            "contact",
            "attributes",
            "created_at",
            "updated_at",
        ]
