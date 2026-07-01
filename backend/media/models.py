from django.db import models

from core.models import TimeStampedModel


class Media(TimeStampedModel):
    """A photo/video tied to a vendor and/or a specific offer."""

    class MediaType(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"

    vendor = models.ForeignKey(
        "vendors.Vendor",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="media",
    )
    offer = models.ForeignKey(
        "catalog.Offer",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="media",
    )
    media_type = models.CharField(
        max_length=10, choices=MediaType.choices, default=MediaType.IMAGE
    )
    image = models.ImageField(upload_to="vendors/", blank=True, null=True)
    external_url = models.URLField(
        blank=True, help_text="For video or externally hosted media."
    )
    caption = models.CharField(max_length=255, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    is_cover_photo = models.BooleanField(default=False)

    class Meta:
        ordering = ["display_order", "id"]
        verbose_name_plural = "media"

    def __str__(self):
        return self.caption or f"Media #{self.pk}"

    @property
    def url(self):
        if self.image:
            return self.image.url
        return self.external_url or ""
