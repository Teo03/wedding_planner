# Wedding Planner — Macedonia

A browse/discover catalog of wedding vendors (venues, catering, photographers,
entertainment, and more) for couples planning a wedding in Macedonia, with a
**wedding plan list** that turns the directory into a planning tool.

The interface is **Macedonian by default**, with English behind a toggle.

- **Backend:** Django + Django REST Framework + PostgreSQL
- **Frontend:** React + Vite + TypeScript + Tailwind
- **Everything runs with one command via Docker Compose.**

> This is a demo project. `.env` ships with dev-only credentials.

**Live:** https://ca-wedding-planner.greenwave-e2536466.polandcentral.azurecontainerapps.io

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
- **Category** — a two-level taxonomy (15 top-level categories, 58
  subcategories) stored as data, not hardcoded. A category is either
  *venue-like* (capacity & location matter) or *service-like* (portfolio &
  media matter), and carries an `audience` (couple / bride / groom) that drives
  the Bride and Groom quick filters. Names are stored in both English and
  Macedonian.
- **Vendor** — a business, tagged with categories and tied to a location, with a
  one-to-one **Contact** (phone/Viber/WhatsApp/email/socials).
- **Offer** — a package a vendor sells. Supports five price types:
  `fixed`, `per_guest`, `tiered_per_guest`, `per_hour`, `starting_at`.
- **OfferPriceTier** — guest-count brackets for `tiered_per_guest` offers.
- **Location / Region** — Macedonian cities plus informal regions
  (e.g. "Ohrid-Struga Lake Region"), also bilingual.
- **Media** — photos tied to a vendor and/or a specific offer, with
  `credit` / `credit_url` for licensed imagery.
- **Review** — a signed-in user's 1–5 rating and written review, one per user
  per vendor. A vendor's own reviews supersede its Google snapshot once any
  exist; both stay visible.

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
  region, price range, and full-text search
- `GET /api/vendors/?min_rating=4.5&audience=bride&ordering=-rating`
  — filter by rating and by who the vendor is for; `rated=1` hides unrated
  vendors, and unrated ones always sort last
- `GET|POST|DELETE /api/vendors/{slug}/reviews/` — read, post/edit, or remove
  your review of a vendor
- `GET /api/vendors/{slug}/` — nested detail (offers, media, contact, categories)
- `GET /api/offers/{id}/estimate/?guests=N` — priced estimate

### Frontend features
- **Macedonian by default**, English behind a toggle. UI copy comes from
  dictionaries; category, city, region and package names come from the database
  in both languages, so a name has exactly one source of truth. Pricing notes
  are sent as a code plus values, so the sentence is rebuilt in the reader's
  language rather than shipped as English prose.
- Categories dropdown in the nav; a side drawer holds guests, currency,
  language and account, keeping the top bar to five targets.
- `/vendors` browses the whole catalog: category chips, Bride/Groom, city,
  max price, minimum rating, search, sort, pagination.
- Star ratings on every card, labelled by source (members or Google), and an
  explicit "no ratings yet" where a vendor genuinely has none.
- Vendor detail with packages, live per-guest estimates, gallery, contact
  links, and a review list plus write/edit/delete form.
- **Wedding Plan List**: one guest-count input drives every guest-dependent
  line; add/remove offers, grouped by category, currency picker,
  persisted to `localStorage`.

---

## Running the tests

```bash
docker compose exec backend pytest
```

Covers the pricing engine (every price type, the minimum-guest rule, tier
selection, translatable note codes), API filtering edge cases (top-level vs
subcategory filters, price range, search, vendors with zero offers), the
rating/review rules (one review per user, site ratings superseding Google,
rating filters and ordering), and the spreadsheet import (mapping coverage,
idempotency, stable generated prices).

---

## Managing data

All vendor/offer/media data entry is done through Django admin
(http://localhost:8000/admin/). The Vendor page has inline forms for Offers,
Media, and Contact, so one screen covers a whole vendor.

Seed data is (re)loaded idempotently on every boot via management commands:

```bash
docker compose exec backend python manage.py seed_taxonomy
docker compose exec backend python manage.py seed_locations
docker compose exec backend python manage.py seed_catalog --flush-demo
```

### Where the catalog data comes from

`seed_catalog` imports the team's research sheet
(`backend/seed_data/wedding-vendor-seed-data-v4.xlsx`, exported to
`vendors.json` so seeding needs no spreadsheet reader): **157 vendors** across
Skopje, Tetovo, Bitola and Ohrid, with address, phone and website.

What is real and what is not:

| Field | Source |
|---|---|
| Vendor, city, address, phone, website | The sheet (compiled July 2026) |
| Google rating + review count | The sheet — **43 of 157 vendors**. The rest are shown as unrated rather than filled with invented numbers. |
| Offers and prices | **Generated.** The sheet has no pricing, and the plan list needs something to price. Generated per subcategory from templates, keyed by vendor slug so re-seeds are stable, and labelled "indicative" in the UI. |
| Cover photos | **Not the vendors' own.** Per the sheet's own notes, scraping vendor photos is a copyright/ToS risk, and only 5 of 157 vendors expose a usable image anyway. Each vendor gets a freely-licensed photo matched to its subcategory, or a real photo of the actual place for the landmark venues. Attribution is stored on the Media row and shown on the vendor page. |

`seed_demo` is kept as a test fixture — it is the only seed that exercises
every pricing path — but no longer runs at boot.

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
│   ├── media/             # Media
│   ├── reviews/           # Review
│   └── seed_data/         # the research sheet + licensed cover imagery
└── frontend/
    └── src/
        ├── api/           # typed client + response types
        ├── components/    # Layout, SideDrawer, VendorCard, OfferCard, reviews
        ├── context/       # SimulatorContext (guest count, currency, plan)
        ├── i18n/          # MK/EN dictionaries and the translation hooks
        └── pages/         # Home, Vendors, CategoryBrowse, VendorDetail, Plan
```

---

## Deploying to Azure

Two paths are scripted; the live one is Container Apps.

```bash
./deploy/azure-containerapps.sh        # the live deployment
./deploy/azure-appservice.sh <name>    # alternative, fully free
```

**Both build the image or the dependencies locally and never on Azure.** That is
not a preference, it is a constraint: App Service Free (F1) allows 60
CPU-minutes per day, and one on-instance `pip install` of Django + Pillow +
psycopg consumes the entire allowance, after which the platform parks the app in
`QuotaExceeded`. The allowance is tracked per subscription *per region*, so
recreating the plan does not reset it -- only waiting for UTC midnight does.

| | Container Apps (live) | App Service F1 |
|---|---|---|
| Compute | Free monthly grant, scale-to-zero | Free, 60 CPU-min/day |
| Database | SQLite on an Azure Files share | SQLite on the `/home` share |
| Persists across restarts | Yes | Yes |
| Cost | ~a few cents/month for the share | £0 |
| Build happens | Locally, image pushed to GHCR | Locally, deps vendored into the zip |

Gunicorn runs a **single worker** on Container Apps: SQLite over SMB can
deadlock with concurrent writers, and WAL mode -- the usual answer -- needs
shared memory that a network filesystem cannot provide.

---

## Notes & simplifications (demo scope)

- Currency conversion uses a single reference rate constant
  (`frontend/src/lib/currency.ts`); in production it would come from the
  National Bank on a schedule.
- Google ratings are a **July 2026 snapshot**, not live data. As the sheet's
  notes say, in production these would be queried from the Google Places API at
  runtime rather than stored.
- Vendor photos are licensed stand-ins, not the businesses' own — see the table
  above. Replacing them with approved images is vendor-outreach work.
- Prices are generated, not quoted. Verify before showing them to a real user.
- No online booking or payments, and no vendor self-service yet.
- An AI chatbot that proposes a plan from a budget is planned but not built.
