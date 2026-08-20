from django.core.paginator import Paginator
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from .models import Category, Offer
from .pricing import estimate_offer


@require_GET
def category_list(request):
    categories = Category.objects.prefetch_related("children")
    if request.GET.get("all") != "1":
        categories = categories.filter(parent__isnull=True)
    return JsonResponse(
        [serialize_category(category) for category in categories],
        safe=False,
    )


@require_GET
def category_detail(request, slug):
    category = get_object_or_404(
        Category.objects.select_related("parent").prefetch_related("children"),
        slug=slug,
    )
    return JsonResponse(serialize_category(category))


@require_GET
def offer_list(request):
    offers = offer_queryset()
    offers = filter_offers(offers, request.GET)
    return JsonResponse(paginate(request, offers, serialize_offer))


@require_GET
def offer_detail(request, pk):
    offer = get_object_or_404(offer_queryset(), pk=pk)
    return JsonResponse(serialize_offer(offer))


@require_GET
def offer_estimate(request, pk):
    offer = get_object_or_404(offer_queryset(), pk=pk)
    raw = request.GET.get("guests")
    guests = int(raw) if raw and raw.isdigit() else None
    return JsonResponse(estimate_offer(offer, guests))


def offer_queryset():
    return (
        Offer.objects.filter(is_active=True)
        .select_related("vendor")
        .prefetch_related("categories", "price_tiers")
    )


def filter_offers(offers, params):
    if vendor := params.get("vendor"):
        offers = offers.filter(vendor__slug__iexact=vendor)
    if category := params.get("category"):
        offers = offers.filter(
            Q(categories__slug=category) | Q(categories__parent__slug=category)
        ).distinct()
    if city := params.get("city"):
        offers = offers.filter(vendor__location__slug__iexact=city)
    if price_type := params.get("price_type"):
        offers = offers.filter(price_type__iexact=price_type)
    if currency := params.get("currency"):
        offers = offers.filter(price_currency__iexact=currency)
    return offers


def serialize_category_summary(category):
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "layout_hint": category.layout_hint,
        "icon": category.icon,
        "audience": category.audience,
        "display_order": category.display_order,
    }


def serialize_category(category):
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "parent": category.parent_id,
        "layout_hint": category.layout_hint,
        "icon": category.icon,
        "audience": category.audience,
        "description": category.description,
        "display_order": category.display_order,
        "children": [
            serialize_category_summary(child) for child in category.children.all()
        ],
    }


def serialize_offer(offer):
    return {
        "id": offer.id,
        "vendor": offer.vendor_id,
        "name": offer.name,
        "description": offer.description,
        "categories": [
            serialize_category_summary(category) for category in offer.categories.all()
        ],
        "price_currency": offer.price_currency,
        "price_type": offer.price_type,
        "price_amount": money(offer.price_amount),
        "price_per_guest": money(offer.price_per_guest),
        "min_guest_count": offer.min_guest_count,
        "min_capacity": offer.min_capacity,
        "max_capacity": offer.max_capacity,
        "attributes": offer.attributes,
        "is_active": offer.is_active,
        "display_order": offer.display_order,
        "price_tiers": [
            {
                "id": tier.id,
                "guests_from": tier.guests_from,
                "guests_to": tier.guests_to,
                "price_per_guest": money(tier.price_per_guest),
            }
            for tier in offer.price_tiers.all()
        ],
    }


def money(value):
    return f"{value:.2f}" if value is not None else None


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
