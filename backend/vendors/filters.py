import django_filters as df
from django.contrib.postgres.search import SearchQuery, SearchVector
from django.db.models import DecimalField, Min, Q
from django.db.models.functions import Coalesce

from .models import Vendor


class VendorFilter(df.FilterSet):
    category = df.CharFilter(method="filter_category")
    city = df.CharFilter(field_name="location__slug", lookup_expr="iexact")
    region = df.CharFilter(field_name="location__region__slug", lookup_expr="iexact")
    status = df.CharFilter(field_name="status", lookup_expr="iexact")
    business_type = df.CharFilter(field_name="business_type", lookup_expr="iexact")
    min_price = df.NumberFilter(method="filter_min_price")
    max_price = df.NumberFilter(method="filter_max_price")
    search = df.CharFilter(method="filter_search")

    class Meta:
        model = Vendor
        fields = ["category", "city", "region", "status", "business_type"]

    def filter_category(self, qs, name, value):
        return qs.filter(
            Q(categories__slug=value) | Q(categories__parent__slug=value)
        ).distinct()

    def _annotate_from_price(self, qs):
        if "_from_price" not in qs.query.annotations:
            qs = qs.annotate(
                _from_price=Min(
                    Coalesce(
                        "offers__price_amount",
                        "offers__price_per_guest",
                        output_field=DecimalField(max_digits=12, decimal_places=2),
                    )
                )
            )
        return qs

    def filter_min_price(self, qs, name, value):
        return self._annotate_from_price(qs).filter(_from_price__gte=value)

    def filter_max_price(self, qs, name, value):
        return self._annotate_from_price(qs).filter(_from_price__lte=value)

    def filter_search(self, qs, name, value):
        # PostgreSQL full-text search over name + description.
        return qs.annotate(
            _search=SearchVector("name", "description")
        ).filter(_search=SearchQuery(value))
