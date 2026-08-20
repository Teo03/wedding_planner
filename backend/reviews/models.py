from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models import TimeStampedModel


class Review(TimeStampedModel):
    """A signed-in user's rating + written review of a vendor.

    One review per user per vendor; editing re-uses the same row so the
    aggregate on Vendor stays a simple average over distinct users.
    """

    vendor = models.ForeignKey(
        "vendors.Vendor", on_delete=models.CASCADE, related_name="reviews"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews"
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    title = models.CharField(max_length=140, blank=True)
    body = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["vendor", "author"], name="uniq_review_per_user_per_vendor"
            )
        ]

    def __str__(self):
        return f"{self.rating}★ {self.vendor.name} by {self.author.username}"
