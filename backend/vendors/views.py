from django.core.paginator import Paginator
from django.db import connection
from django.db.models import (
    Avg,
    Count,
    DecimalField,
    F,
    FloatField,
    Min,
    OuterRef,
    Q,
    Subquery,
)
from django.db.models.functions import Cast, Coalesce
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from .models import Vendor
from catalog.views import money, serialize_category_summary, serialize_offer
from locations.views import serialize_location
from reviews.models import Review


@require_GET
def vendor_list(request):
    vendors = vendor_queryset()
    vendors = filter_vendors(vendors, request.GET)
    vendors = order_vendors(vendors, request.GET.get("ordering"))
    return JsonResponse(paginate(request, vendors, serialize_vendor_list))


@require_GET
def vendor_detail(request, slug):
    vendor = get_object_or_404(vendor_queryset(), slug=slug)
    return JsonResponse(serialize_vendor_detail(vendor))


def vendor_queryset():
    return (
        Vendor.objects.select_related("location", "location__region", "contact")
        .prefetch_related(
            "categories",
            "media",
            "offers",
            "offers__categories",
            "offers__price_tiers",
        )
        .annotate(**rating_annotations())
    )


def rating_annotations():
    """Site rating as subqueries, so category/offer joins can't skew the average.

    `_rating` is what the UI sorts and filters on: a vendor's own reviews once
    it has any, otherwise the Google snapshot carried in from the seed sheet.
    """
    per_vendor = Review.objects.filter(vendor=OuterRef("pk")).values("vendor")
    return {
        "_site_rating": Subquery(
            per_vendor.annotate(v=Avg("rating")).values("v"),
            output_field=FloatField(),
        ),
        "_site_count": Coalesce(
            Subquery(
                per_vendor.annotate(v=Count("id")).values("v"),
                output_field=FloatField(),
            ),
            0.0,
        ),
        "_rating": Coalesce(
            Subquery(
                per_vendor.annotate(v=Avg("rating")).values("v"),
                output_field=FloatField(),
            ),
            Cast("google_rating", FloatField()),
        ),
    }


def filter_vendors(vendors, params):
    if category := params.get("category"):
        vendors = vendors.filter(
            Q(categories__slug=category) | Q(categories__parent__slug=category)
        ).distinct()
    if city := params.get("city"):
        vendors = vendors.filter(location__slug__iexact=city)
    if region := params.get("region"):
        vendors = vendors.filter(location__region__slug__iexact=region)
    if status := params.get("status"):
        vendors = vendors.filter(status__iexact=status)
    if business_type := params.get("business_type"):
        vendors = vendors.filter(business_type__iexact=business_type)
    if params.get("min_price") or params.get("max_price"):
        vendors = annotate_from_price(vendors)
    if min_price := params.get("min_price"):
        vendors = vendors.filter(_from_price__gte=min_price)
    if max_price := params.get("max_price"):
        vendors = vendors.filter(_from_price__lte=max_price)
    if audience := params.get("audience"):
        vendors = vendors.filter(
            Q(categories__audience__iexact=audience)
            | Q(categories__parent__audience__iexact=audience)
        ).distinct()
    if min_rating := params.get("min_rating"):
        try:
            vendors = vendors.filter(_rating__gte=float(min_rating))
        except ValueError:
            pass
    if params.get("rated") == "1":
        vendors = vendors.filter(_rating__isnull=False)
    if search := params.get("search"):
        vendors = filter_search(vendors, search)
    return vendors


def filter_search(vendors, term):
    # PostgreSQL full-text search over name + description when available; fall
    # back to a case-insensitive substring match on other backends (e.g. the
    # SQLite-backed production deploy), which have no SearchVector support.
    if connection.vendor == "postgresql":
        from django.contrib.postgres.search import SearchQuery, SearchVector

        return vendors.annotate(
            _search=SearchVector("name", "description")
        ).filter(_search=SearchQuery(term))
    return vendors.filter(
        Q(name__icontains=term) | Q(description__icontains=term)
    )


def annotate_from_price(vendors):
    if "_from_price" in vendors.query.annotations:
        return vendors
    return vendors.annotate(
        _from_price=Min(
            Coalesce(
                "offers__price_amount",
                "offers__price_per_guest",
                output_field=DecimalField(max_digits=12, decimal_places=2),
            )
        )
    )


def order_vendors(vendors, ordering):
    allowed = {"name", "-name", "created_at", "-created_at"}
    if ordering in {"rating", "-rating"}:
        # Unrated vendors sort last either way rather than leading on NULLs.
        rating = F("_rating")
        direction = (
            rating.desc(nulls_last=True)
            if ordering.startswith("-")
            else rating.asc(nulls_last=True)
        )
        return vendors.order_by(direction, "name")
    if ordering in allowed:
        return vendors.order_by(ordering)
    return vendors.order_by("name")


def serialize_vendor_list(vendor):
    return {
        "id": vendor.id,
        "name": vendor.name,
        "slug": vendor.slug,
        "business_type": vendor.business_type,
        "status": vendor.status,
        "location": serialize_location(vendor.location) if vendor.location else None,
        "categories": [
            serialize_category_summary(category) for category in vendor.categories.all()
        ],
        "cover_photo": cover_photo(vendor),
        "from_price": from_price(vendor),
        "rating": round(vendor._rating, 2) if getattr(vendor, "_rating", None) else None,
        "rating_source": rating_source(vendor),
        "site_rating": (
            round(vendor._site_rating, 2)
            if getattr(vendor, "_site_rating", None)
            else None
        ),
        "site_review_count": int(getattr(vendor, "_site_count", 0) or 0),
        "google_rating": (
            float(vendor.google_rating) if vendor.google_rating is not None else None
        ),
        "google_review_count": vendor.google_review_count,
    }


def rating_source(vendor):
    if getattr(vendor, "_site_rating", None):
        return "site"
    return "google" if vendor.google_rating is not None else None


def serialize_vendor_detail(vendor):
    data = serialize_vendor_list(vendor)
    data.update(
        {
            "description": vendor.description,
            "founded_year": vendor.founded_year,
            "address": vendor.address,
            "offers": [
                serialize_offer(offer)
                for offer in vendor.offers.all()
                if offer.is_active
            ],
            "media": [serialize_media(media) for media in vendor.media.all()],
            "contact": serialize_contact(vendor.contact)
            if hasattr(vendor, "contact")
            else None,
            "attributes": vendor.attributes,
            "created_at": vendor.created_at.isoformat(),
            "updated_at": vendor.updated_at.isoformat(),
        }
    )
    return data


def serialize_media(media):
    return {
        "id": media.id,
        "media_type": media.media_type,
        "url": media.url,
        "caption": media.caption,
        "credit": media.credit,
        "credit_url": media.credit_url,
        "display_order": media.display_order,
        "is_cover_photo": media.is_cover_photo,
        "offer": media.offer_id,
    }


def serialize_contact(contact):
    return {
        "phone": contact.phone,
        "viber": contact.viber,
        "whatsapp": contact.whatsapp,
        "email": contact.email,
        "website": contact.website,
        "instagram": contact.instagram,
        "facebook": contact.facebook,
    }


def cover_photo(vendor):
    media = list(vendor.media.all())
    cover = next((item for item in media if item.is_cover_photo), None)
    cover = cover or (media[0] if media else None)
    return cover.url if cover else None


def from_price(vendor):
    prices = []
    for offer in vendor.offers.all():
        if not offer.is_active:
            continue
        if offer.price_amount is not None:
            prices.append(offer.price_amount)
        elif offer.price_per_guest is not None:
            prices.append(offer.price_per_guest)
    return money(min(prices)) if prices else None


def paginate(request, queryset, serialize):
    paginator = Paginator(queryset, 12)
    page = paginator.get_page(request.GET.get("page") or 1)
    return {
        "count": paginator.count,
        "next": page_url(request, page.next_page_number()) if page.has_next() else None,
        "previous": (
            page_url(request, page.previous_page_number())
            if page.has_previous()
            else None
        ),
        "results": [serialize(item) for item in page.object_list],
    }


def page_url(request, page_number):
    params = request.GET.copy()
    params["page"] = page_number
    return request.build_absolute_uri(f"{request.path}?{params.urlencode()}")
