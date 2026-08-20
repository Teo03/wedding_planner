from django.db import models

from core.models import TimeStampedModel


class Region(models.Model):
    """Informal grouping couples search by (e.g. 'Ohrid-Struga Lake Region')."""

    name = models.CharField(max_length=120, unique=True)
    name_mk = models.CharField(max_length=140, blank=True)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Location(TimeStampedModel):
    """A city/municipality a vendor operates from."""

    name = models.CharField(max_length=120, unique=True)
    name_mk = models.CharField(max_length=140, blank=True)
    slug = models.SlugField(max_length=140, unique=True)
    region = models.ForeignKey(
        Region,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="locations",
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "name"]

    def __str__(self):
        return self.name
