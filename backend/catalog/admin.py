from django.contrib import admin

from media.models import Media

from .models import Category, Offer, OfferPriceTier


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("__str__", "layout_hint", "display_order")
    list_filter = ("layout_hint", "parent")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


class OfferPriceTierInline(admin.TabularInline):
    model = OfferPriceTier
    extra = 0


class OfferMediaInline(admin.TabularInline):
    model = Media
    fk_name = "offer"
    extra = 0


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "vendor",
        "price_type",
        "price_amount",
        "price_per_guest",
        "is_active",
    )
    list_filter = ("price_type", "price_currency", "is_active", "categories")
    search_fields = ("name", "vendor__name")
    filter_horizontal = ("categories",)
    inlines = [OfferPriceTierInline, OfferMediaInline]
