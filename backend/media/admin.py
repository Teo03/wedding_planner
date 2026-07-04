from django.contrib import admin

from .models import Media


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    list_display = ("__str__", "vendor", "offer", "media_type", "is_cover_photo")
    list_filter = ("media_type", "is_cover_photo")
    search_fields = ("caption",)
