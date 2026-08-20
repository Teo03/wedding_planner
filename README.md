# Wedding Vendor Catalog — North Macedonia

A browse/discover catalog of wedding vendors (venues, catering, photographers,
entertainment, and more) for couples planning a wedding in North Macedonia,
with a **live cost simulator** that turns the directory into a planning tool.

- **Backend:** Django + Django REST Framework + PostgreSQL
- **Frontend:** React + Vite + TypeScript + Tailwind
- **Everything runs with one command via Docker Compose.**

> This is a demo project. `.env` ships with dev-only credentials.

---

## Quick start

```bash
docker compose up --build
```

That brings up three containers, runs migrations, seeds the catalog, and
creates an admin user. Then open:

| URL | What |
|---|---|
| http://localhost:3000 | Frontend app |
| http://localhost:8000/api/ | REST API root |
| http://localhost:8000/api/docs/ | Swagger UI (OpenAPI) |
| http://localhost:8000/admin/ | Django admin (`admin` / `admin`) |

Stop with `docker compose down` (add `-v` to also drop the database volume).

---

## What's inside

### The catalog data model
- **Category** — a two-level taxonomy (14 top-level categories, 50 subcategories)
  stored as data, not hardcoded. A category is either *venue-like* (capacity &
  location matter) or *service-like* (portfolio & media matter).
- **Vendor** — a business, tagged with categories and tied to a location, with a
  one-to-one **Contact** (phone/Viber/WhatsApp/email/socials).
- **Offer** — a package a vendor sells. Supports five price types:
  `fixed`, `per_guest`, `tiered_per_guest`, `per_hour`, `starting_at`.
- **OfferPriceTier** — guest-count brackets for `tiered_per_guest` offers.
- **Location / Region** — North Macedonia cities plus informal regions
  (e.g. "Ohrid-Struga Lake Region").
- **Media** — photos tied to a vendor and/or a specific offer.

### The pricing engine (`backend/catalog/pricing.py`)
The trickiest business rule, kept server-side so the frontend never re-implements
pricing:

- `min_capacity` — smallest event the vendor will accept (booking floor)
- `max_capacity` — hard ceiling on guests
- `min_guest_count` — the minimum guests the vendor **bills** for, regardless of
  turnout (a pricing floor). When the guest count is below it, the estimate is
  computed as if for the minimum and **clearly labeled**, never silently.

Exposed at `GET /api/offers/{id}/estimate/?guests=120`.

### API highlights
- `POST /api/auth/register/` — create a user and set HTTP-only JWT cookies
- `POST /api/auth/login/` — sign in and set HTTP-only JWT cookies
- `POST /api/auth/refresh/` — refresh the HTTP-only access-token cookie
- `POST /api/auth/logout/` — clear auth cookies
- `GET /api/auth/me/` — current authenticated user
- `GET /api/categories/` — the category tree (top-level with nested children)
- `GET /api/vendors/?category=venues&city=ohrid&max_price=1000&search=lakeside`
  — filter by category (top-level slug matches all its subcategories), city,
  region, price range, and PostgreSQL full-text search
- `GET /api/vendors/{slug}/` — nested detail (offers, media, contact, categories)
- `GET /api/offers/{id}/estimate/?guests=N` — priced estimate

### Frontend features
- Browse by category → subcategory / city / price / search filters
- Vendor detail with packages, live per-guest estimates, gallery, contact links
- **Cost simulator**: one guest-count input drives every guest-dependent line;
  add/remove offers, grouped by category like a budget sheet, EUR ⇄ MKD toggle,
  persisted to `localStorage`

---

## Running the tests

```bash
docker compose exec backend pytest
```

Covers the pricing engine (every price type, the minimum-guest rule, tier
selection) and API filtering edge cases (top-level vs subcategory filters,
price range, full-text search, vendors with zero offers).

---

## Managing data

All vendor/offer/media data entry is done through Django admin
(http://localhost:8000/admin/). The Vendor page has inline forms for Offers,
Media, and Contact, so one screen covers a whole vendor.

Seed data is (re)loaded idempotently on every boot via management commands:

```bash
docker compose exec backend python manage.py seed_taxonomy
docker compose exec backend python manage.py seed_locations
docker compose exec backend python manage.py seed_demo
```

---

## Project structure

```
.
├── docker-compose.yml
├── backend/
│   ├── config/            # Django project (settings, urls, api router)
│   ├── core/              # shared TimeStampedModel base
│   ├── catalog/           # Category, Offer, OfferPriceTier, pricing engine
│   ├── vendors/           # Vendor, Contact
│   ├── locations/         # Location, Region
│   └── media/             # Media
└── frontend/
    └── src/
        ├── api/           # typed client + response types
        ├── components/    # Layout, VendorCard, OfferCard
        ├── context/       # SimulatorContext (guest count, currency, budget)
        └── pages/         # Home, CategoryBrowse, VendorDetail, Simulator
```

---

## Notes & simplifications (demo scope)

- Currency conversion uses a single reference rate constant
  (`frontend/src/lib/currency.ts`); in production it would come from the National
  Bank of North Macedonia on a schedule.
- Demo vendor photos are loaded from an external placeholder service.
- No online booking/payments, no vendor self-service, no reviews (kept possible
  by the schema, not built).
