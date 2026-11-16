export function canonicalUrl(site, path = '/') {
  return new URL(path, site.seo.url).href;
}

export function homeStructuredData(site, directions) {
  const url = canonicalUrl(site);
  const organization = `${url}#organization`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization', '@id': organization,
        name: site.name, url, description: site.description,
        logo: canonicalUrl(site, '/assets/favicon.svg'),
        sameAs: [site.telegram],
      },
      {
        '@type': 'WebSite', '@id': `${url}#website`, name: site.name,
        url, inLanguage: 'ru-RU', publisher: { '@id': organization },
      },
      {
        '@type': 'WebPage', '@id': `${url}#webpage`, url,
        name: site.seo.title, description: site.seo.description,
        inLanguage: 'ru-RU', isPartOf: { '@id': `${url}#website` },
        about: directions.items.map(({ id }) => ({ '@id': `${url}#service-${id}` })),
      },
      ...directions.items.map((direction) => ({
        '@type': 'Service', '@id': `${url}#service-${direction.id}`,
        name: `Консультации и разбор заданий: ${direction.title}`,
        description: `${direction.description} ${direction.helpExamples.join('. ')}.`,
        serviceType: direction.title, provider: { '@id': organization },
        url: `${url}?direction=${encodeURIComponent(direction.id)}`,
        areaServed: { '@type': 'Country', name: 'Россия' },
      })),
    ],
  };
}

// Содержимое JSON-LD не должно закрывать тег script даже при правке текстов.
export const jsonLd = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

export function robotsText(site) {
  if (!site.seo.indexable) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\n\nSitemap: ${canonicalUrl(site, '/sitemap.xml')}\n`;
}

export function sitemapXml(site) {
  const urls = site.seo.indexable ? [canonicalUrl(site)] : [];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${url.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</loc></url>`).join('\n')}\n</urlset>\n`;
}
