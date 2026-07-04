from django.contrib import admin

from .models import Location, Region


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ("name", "region", "display_order")
    list_filter = ("region",)
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
