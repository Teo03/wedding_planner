from django.db import models

from core.models import TimeStampedModel


class Vendor(TimeStampedModel):
    class BusinessType(models.TextChoices):
        COMPANY = "company", "Company"
        INDIVIDUAL = "individual", "Individual"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        PENDING = "pending", "Pending review"

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    description = models.TextField(blank=True)
    founded_year = models.PositiveIntegerField(null=True, blank=True)
    business_type = models.CharField(
        max_length=12, choices=BusinessType.choices, default=BusinessType.COMPANY
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ACTIVE
    )
    address = models.CharField(max_length=255, blank=True)
    # Snapshot of the vendor's Google Places rating at seed time. Kept separate
    # from in-app Review aggregates: this is third-party data we don't own and
    # can't recompute, and per the seed sheet's notes it goes stale quickly.
    google_rating = models.DecimalField(
        max_digits=2, decimal_places=1, null=True, blank=True
    )
    google_review_count = models.PositiveIntegerField(null=True, blank=True)
    location = models.ForeignKey(
        "locations.Location",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="vendors",
    )
    categories = models.ManyToManyField(
        "catalog.Category", related_name="vendors", blank=True
    )
    attributes = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Contact(models.Model):
    vendor = models.OneToOneField(
        Vendor, on_delete=models.CASCADE, related_name="contact"
    )
    phone = models.CharField(max_length=40, blank=True)
    viber = models.CharField(max_length=40, blank=True)
    whatsapp = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    instagram = models.CharField(max_length=120, blank=True)
    facebook = models.CharField(max_length=120, blank=True)

    def __str__(self):
        return f"Contact for {self.vendor.name}"
