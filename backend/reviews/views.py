"""Review endpoints.

DRF APIViews rather than the plain Django views the rest of the catalog uses:
these are the only write endpoints outside `accounts`, and the auth cookie is
a cookie, so they need DRF's authentication handling instead of Django's
session-oriented CSRF middleware -- same reason accounts/ is built this way.
"""
from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.auth import CookieJWTAuthentication
from vendors.models import Vendor

from .models import Review


class VendorReviewsView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        vendor = get_object_or_404(Vendor, slug=slug)
        reviews = vendor.reviews.select_related("author")
        return Response(
            {
                "count": reviews.count(),
                "summary": rating_summary(vendor),
                "results": [serialize_review(review) for review in reviews],
            }
        )

    def post(self, request, slug):
        vendor = get_object_or_404(Vendor, slug=slug)
        rating = request.data.get("rating")
        if isinstance(rating, str) and rating.isdigit():
            rating = int(rating)
        if not isinstance(rating, int) or not 1 <= rating <= 5:
            return Response(
                {"detail": "A rating between 1 and 5 is required."}, status=400
            )

        review, created = Review.objects.update_or_create(
            vendor=vendor,
            author=request.user,
            defaults={
                "rating": rating,
                "title": (request.data.get("title") or "")[:140],
                "body": request.data.get("body") or "",
            },
        )
        return Response(
            {"review": serialize_review(review), "summary": rating_summary(vendor)},
            status=201 if created else 200,
        )

    def delete(self, request, slug):
        vendor = get_object_or_404(Vendor, slug=slug)
        deleted, _ = Review.objects.filter(vendor=vendor, author=request.user).delete()
        if not deleted:
            return Response({"detail": "No review to delete."}, status=404)
        return Response({"summary": rating_summary(vendor)})


def rating_summary(vendor):
    """Site ratings, Google's snapshot, and the blend the listings sort on."""
    agg = vendor.reviews.aggregate(avg=Avg("rating"), count=Count("id"))
    site_avg = round(agg["avg"], 2) if agg["avg"] is not None else None
    google = float(vendor.google_rating) if vendor.google_rating is not None else None
    return {
        "site_rating": site_avg,
        "site_review_count": agg["count"],
        "google_rating": google,
        "google_review_count": vendor.google_review_count,
        "rating": site_avg if site_avg is not None else google,
        "rating_source": (
            "site" if site_avg is not None else ("google" if google else None)
        ),
        "histogram": histogram(vendor),
    }


def histogram(vendor):
    counts = {str(score): 0 for score in range(1, 6)}
    for row in vendor.reviews.values("rating").annotate(n=Count("id")):
        counts[str(row["rating"])] = row["n"]
    return counts


def serialize_review(review):
    author = review.author
    return {
        "id": review.id,
        "rating": review.rating,
        "title": review.title,
        "body": review.body,
        "author": author.first_name or author.username,
        "author_id": author.id,
        "created_at": review.created_at.isoformat(),
        "updated_at": review.updated_at.isoformat(),
    }
