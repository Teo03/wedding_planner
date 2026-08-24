import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import OfferCard from "../components/OfferCard";
import RatingBadge from "../components/RatingBadge";
import ReviewSection from "../components/ReviewSection";
import type { Contact } from "../api/types";
import { useI18n, useLocalName } from "../i18n";
import vendorPlaceholder from "../assets/vendor-placeholder.png";

export default function VendorDetail() {
  const { slug = "" } = useParams();
  const { t } = useI18n();
  const localName = useLocalName();
  const { data: vendor, loading, error } = useAsync(
    () => api.vendor(slug),
    [slug],
  );

  if (loading)
    return <p className="py-12 text-center text-taupe-300">{t("browse.loading")}</p>;
  if (error || !vendor)
    return (
      <p className="py-12 text-center text-taupe-300">{t("vendor.notFound")}</p>
    );

  const allPhotos = vendor.media.filter((m) => m.url);
  const cover = vendor.cover_photo ?? allPhotos[0]?.url;
  const coverCredit = allPhotos.find((m) => m.url === cover)?.credit;
  const gallery = allPhotos.filter((m) => m.url !== cover);

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-2xl bg-cream-100">
        <img
          src={cover || vendorPlaceholder}
          alt={vendor.name}
          className="h-64 w-full object-cover sm:h-80"
        />
      </div>
      {coverCredit && (
        <p className="-mt-6 text-right text-xs text-taupe-200">
          {t("vendor.photoCredit", { credit: coverCredit })}
        </p>
      )}

      <div>
        <h1 className="font-display text-4xl font-semibold">{vendor.name}</h1>
        <div className="mt-2">
          <RatingBadge vendor={vendor} size={17} />
        </div>
        <p className="mt-1.5 text-taupe-400">
          {localName(vendor.location)}
          {vendor.location?.region
            ? ` · ${localName(vendor.location.region)}`
            : ""}
          {vendor.address ? ` · ${vendor.address}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {vendor.categories.map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-olive-100 px-2 py-0.5 text-xs text-olive-400"
            >
              {localName(c)}
            </span>
          ))}
        </div>
      </div>

      {vendor.description && (
        <p className="max-w-3xl text-taupe-500">{vendor.description}</p>
      )}

      <section>
        <h2 className="font-display mb-3 text-2xl font-semibold">
          {t("vendor.packages")}
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {vendor.offers.map((o) => (
            <OfferCard key={o.id} offer={o} vendor={vendor} />
          ))}
          {vendor.offers.length === 0 && (
            <p className="text-taupe-300">{t("vendor.noPackages")}</p>
          )}
        </div>
      </section>

      {gallery.length > 0 && (
        <section>
          <h2 className="font-display mb-3 text-2xl font-semibold">
            {t("vendor.gallery")}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {gallery.map((m) => (
              <img
                key={m.id}
                src={m.url}
                alt={m.caption}
                className="aspect-[3/2] w-full rounded-lg object-cover"
                loading="lazy"
              />
            ))}
          </div>
        </section>
      )}

      <ReviewSection vendorSlug={vendor.slug} />

      {vendor.contact && <ContactBlock contact={vendor.contact} />}
    </div>
  );
}

function ContactBlock({ contact }: { contact: Contact }) {
  const { t } = useI18n();
  const links: { label: string; href: string }[] = [];
  if (contact.phone)
    links.push({
      label: t("vendor.call", { phone: contact.phone }),
      href: `tel:${contact.phone.replace(/\s/g, "")}`,
    });
  if (contact.whatsapp)
    links.push({
      label: "WhatsApp",
      href: `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`,
    });
  if (contact.viber)
    links.push({
      label: "Viber",
      href: `viber://chat?number=${encodeURIComponent(contact.viber)}`,
    });
  if (contact.email)
    links.push({ label: t("vendor.email"), href: `mailto:${contact.email}` });
  if (contact.website)
    links.push({ label: t("vendor.website"), href: contact.website });
  if (contact.instagram)
    links.push({
      label: "Instagram",
      href: `https://instagram.com/${contact.instagram}`,
    });
  if (contact.facebook)
    links.push({
      label: "Facebook",
      href: contact.facebook.startsWith("http")
        ? contact.facebook
        : `https://facebook.com/${contact.facebook}`,
    });

  if (links.length === 0) return null;

  return (
    <section className="rounded-2xl border border-taupe-100 bg-white p-6">
      <h2 className="font-display mb-3 text-2xl font-semibold">
        {t("vendor.contact")}
      </h2>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-taupe-100 px-4 py-2 text-sm font-medium text-forest-600 hover:border-olive-300 hover:bg-cream-50"
          >
            {l.label}
          </a>
        ))}
      </div>
    </section>
  );
}
