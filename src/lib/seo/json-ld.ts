import { site } from "@/lib/site";
import type { Business, RankingWithEntries } from "@/types/database";

/**
 * Structured-data builders.
 *
 * Each returns a plain object that pages render inside a
 * `<script type="application/ld+json">`. Nothing here asserts a rating: we do
 * not publish our own numeric scores, and emitting an aggregateRating we cannot
 * substantiate would be misleading to both readers and search engines.
 */

export interface BreadcrumbItem {
  name: string;
  href: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${site.url}${item.href}`,
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    description: site.description,
    areaServed: {
      "@type": "Place",
      name: "Long Island, New York",
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${site.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Article + ItemList for a ranking page. */
export function rankingJsonLd(ranking: RankingWithEntries) {
  const url = `${site.url}/best/${ranking.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: ranking.title,
    description: ranking.description ?? undefined,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: ranking.published_at ?? undefined,
    dateModified: ranking.updated_at,
    author: {
      "@type": "Organization",
      name: ranking.author_name ?? site.name,
    },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
    },
    about: ranking.category?.name,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: ranking.entries.length,
      itemListElement: ranking.entries.map((entry) => ({
        "@type": "ListItem",
        position: entry.position,
        name: entry.business.name,
        url: `${site.url}/business/${entry.business.slug}`,
      })),
    },
  };
}

/** LocalBusiness for a business profile. */
export function businessJsonLd(business: Business) {
  const address =
    business.address || business.city
      ? {
          "@type": "PostalAddress",
          streetAddress: business.address ?? undefined,
          addressLocality: business.city ?? undefined,
          addressRegion: "NY",
          postalCode: business.zip ?? undefined,
          addressCountry: "US",
        }
      : undefined;

  const geo =
    business.latitude !== null && business.longitude !== null
      ? {
          "@type": "GeoCoordinates",
          latitude: business.latitude,
          longitude: business.longitude,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    url: `${site.url}/business/${business.slug}`,
    description: business.description ?? undefined,
    telephone: business.phone ?? undefined,
    sameAs: business.website ? [business.website] : undefined,
    address,
    geo,
  };
}

/** Renders a JSON-LD script tag's props. Keeps pages free of dangerouslySet noise. */
export function jsonLdScriptProps(data: object) {
  return {
    type: "application/ld+json",
    // JSON.stringify output is escaped for the one character that can break out
    // of a script element.
    dangerouslySetInnerHTML: {
      __html: JSON.stringify(data).replace(/</g, "\\u003c"),
    },
  } as const;
}
