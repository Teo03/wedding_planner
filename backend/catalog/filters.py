import django_filters as df
from django.db.models import Q

from .models import Offer


class OfferFilter(df.FilterSet):
    vendor = df.CharFilter(field_name="vendor__slug", lookup_expr="iexact")
    category = df.CharFilter(method="filter_category")
    city = df.CharFilter(field_name="vendor__location__slug", lookup_expr="iexact")
    price_type = df.CharFilter(field_name="price_type", lookup_expr="iexact")
    currency = df.CharFilter(field_name="price_currency", lookup_expr="iexact")

    class Meta:
        model = Offer
        fields = ["vendor", "category", "city", "price_type", "currency"]

    def filter_category(self, qs, name, value):
        # A slug matches the (sub)category directly or via its parent, so a
        # top-level slug returns everything tagged under it.
        return qs.filter(
            Q(categories__slug=value) | Q(categories__parent__slug=value)
        ).distinct()
