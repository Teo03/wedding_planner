from rest_framework import serializers

from .models import Category, Offer, OfferPriceTier


class CategorySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "layout_hint", "icon", "display_order"]


class CategorySerializer(serializers.ModelSerializer):
    """Top-level category with its nested subcategories."""

    children = CategorySummarySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "parent",
            "layout_hint",
            "icon",
            "description",
            "display_order",
            "children",
        ]


class OfferPriceTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = OfferPriceTier
        fields = ["id", "guests_from", "guests_to", "price_per_guest"]


class OfferSerializer(serializers.ModelSerializer):
    price_tiers = OfferPriceTierSerializer(many=True, read_only=True)
    categories = CategorySummarySerializer(many=True, read_only=True)

    class Meta:
        model = Offer
        fields = [
            "id",
            "vendor",
            "name",
            "description",
            "categories",
            "price_currency",
            "price_type",
            "price_amount",
            "price_per_guest",
            "min_guest_count",
            "min_capacity",
            "max_capacity",
            "attributes",
            "is_active",
            "display_order",
            "price_tiers",
        ]
