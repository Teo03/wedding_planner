import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import OfferCard from "../components/OfferCard";
import type { Contact } from "../api/types";

export default function VendorDetail() {
  const { slug = "" } = useParams();
  const { data: vendor, loading, error } = useAsync(
    () => api.vendor(slug),
    [slug],
  );

  if (loading) return <p className="text-stone-400">Loading…</p>;
  if (error || !vendor)
    return <p className="text-stone-400">Vendor not found.</p>;

  const gallery = vendor.media.filter((m) => m.url);
  const cover = vendor.cover_photo ?? gallery[0]?.url;

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-2xl bg-stone-100">
        {cover && (
          <img
            src={cover}
            alt={vendor.name}
            className="h-64 w-full object-cover sm:h-80"
          />
        )}
      </div>

      <div>
        <h1 className="text-3xl font-semibold">{vendor.name}</h1>
        <p className="mt-1 text-stone-500">
          {vendor.location?.name}
          {vendor.location?.region ? ` · ${vendor.location.region.name}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {vendor.categories.map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700"
            >
              {c.name}
            </span>
          ))}
        </div>
      </div>

      {vendor.description && (
        <p className="max-w-3xl text-stone-700">{vendor.description}</p>
      )}

      <section>
        <h2 className="mb-3 text-xl font-semibold">Packages</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {vendor.offers.map((o) => (
            <OfferCard key={o.id} offer={o} vendor={vendor} />
          ))}
          {vendor.offers.length === 0 && (
            <p className="text-stone-400">No packages listed.</p>
          )}
        </div>
      </section>

      {gallery.length > 1 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Gallery</h2>
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

      {vendor.contact && <ContactBlock contact={vendor.contact} />}
    </div>
  );
}

function ContactBlock({ contact }: { contact: Contact }) {
  const links: { label: string; href: string }[] = [];
  if (contact.phone)
    links.push({
      label: `Call ${contact.phone}`,
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
    links.push({ label: "Email", href: `mailto:${contact.email}` });
  if (contact.website)
    links.push({ label: "Website", href: contact.website });
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
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <h2 className="mb-3 text-xl font-semibold">Contact</h2>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
          >
            {l.label}
          </a>
        ))}
      </div>
    </section>
  );
}
