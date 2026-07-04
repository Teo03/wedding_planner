from django.contrib import admin

from catalog.models import Offer
from media.models import Media

from .models import Contact, Vendor


class ContactInline(admin.StackedInline):
    model = Contact
    extra = 0
    can_delete = False


class OfferInline(admin.StackedInline):
    model = Offer
    extra = 1
    filter_horizontal = ("categories",)
    show_change_link = True


class VendorMediaInline(admin.TabularInline):
    model = Media
    fk_name = "vendor"
    extra = 1


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ("name", "business_type", "status", "location", "offer_count")
    list_filter = ("status", "business_type", "location", "categories")
    search_fields = ("name", "description")
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("categories",)
    inlines = [ContactInline, OfferInline, VendorMediaInline]

    @admin.display(description="Offers")
    def offer_count(self, obj):
        return obj.offers.count()
