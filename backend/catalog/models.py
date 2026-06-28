from django.db import models

from core.models import TimeStampedModel


class Category(models.Model):
    """Two-level taxonomy: top-level (parent is null) -> subcategory."""

    class Layout(models.TextChoices):
        VENUE = "venue", "Venue-like (capacity & location matter)"
        SERVICE = "service", "Service-like (portfolio & media matter)"

    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children",
    )
    layout_hint = models.CharField(
        max_length=10, choices=Layout.choices, default=Layout.SERVICE
    )
    icon = models.CharField(max_length=40, blank=True)
    description = models.CharField(max_length=255, blank=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "name"]
        verbose_name_plural = "categories"
        constraints = [
            models.UniqueConstraint(
                fields=["parent", "name"], name="uniq_category_name_per_parent"
            )
        ]

    def __str__(self):
        if self.parent_id is None:
            return self.name
        return f"{self.parent.name} > {self.name}"

    @property
    def is_top_level(self):
        return self.parent_id is None


class Offer(TimeStampedModel):
    """A package/service a vendor sells. Spans one or more (sub)categories."""

    class Currency(models.TextChoices):
        EUR = "EUR", "Euro"
        MKD = "MKD", "Denar"

    class PriceType(models.TextChoices):
        FIXED = "fixed", "Fixed price"
        PER_GUEST = "per_guest", "Per guest"
        TIERED_PER_GUEST = "tiered_per_guest", "Tiered per guest"
        PER_HOUR = "per_hour", "Per hour"
        STARTING_AT = "starting_at", "Starting at"

    vendor = models.ForeignKey(
        "vendors.Vendor", on_delete=models.CASCADE, related_name="offers"
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    categories = models.ManyToManyField(Category, related_name="offers", blank=True)

    price_currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.EUR
    )
    price_type = models.CharField(
        max_length=20, choices=PriceType.choices, default=PriceType.FIXED
    )
    price_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Used for fixed / per_hour / starting_at.",
    )
    price_per_guest = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Used for per_guest.",
    )
    min_guest_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Billing floor: minimum guests billed regardless of turnout.",
    )
    min_capacity = models.PositiveIntegerField(
        null=True, blank=True, help_text="Booking floor: smallest event accepted."
    )
    max_capacity = models.PositiveIntegerField(
        null=True, blank=True, help_text="Hard ceiling on guests."
    )
    attributes = models.JSONField(
        default=dict,
        blank=True,
        help_text="Category-specific attributes (e.g. style tags, has_parking).",
    )
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "name"]

    def __str__(self):
        return f"{self.name} ({self.vendor.name})"


class OfferPriceTier(models.Model):
    """A guest-count bracket, used only when Offer.price_type = tiered_per_guest."""

    offer = models.ForeignKey(
        Offer, on_delete=models.CASCADE, related_name="price_tiers"
    )
    guests_from = models.PositiveIntegerField()
    guests_to = models.PositiveIntegerField(
        null=True, blank=True, help_text="Null means 'and above'."
    )
    price_per_guest = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ["guests_from"]

    def __str__(self):
        upper = self.guests_to if self.guests_to is not None else "+"
        return f"{self.guests_from}-{upper} @ {self.price_per_guest}/guest"
