import { canonicalUrl, jsonLd } from './seo.mjs';

export const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const icons = {
  back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
  down: '<path d="M12 5v14m-5-5 5 5 5-5"/>',
  up: '<path d="M12 19V5m-5 5 5-5 5 5"/>',
  outbound: '<path d="M7 17 17 7M7 7h10v10"/>',
  forward: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
};

export function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
}

export function brand(site, root, href) {
  return `<a class="brand" href="${root}${href}"><img src="${root}assets/favicon.svg" alt="" width="39" height="39"><span>${escape(site.name)}</span></a>`;
}

export function telegram(site, className) {
  return `<a class="${className}" href="${escape(site.telegram)}"><span>${escape(site.telegramLabel)}</span>${icon('outbound')}</a>`;
}

export function layout({ site, title, description, root = './', styles, body, scripts = [], image = '', path = '/', indexable = false, structuredData }) {
  const canonical = canonicalUrl(site, path);
  const index = site.seo.indexable && indexable;
  const imageUrl = image ? canonicalUrl(site, '/assets/social.jpg') : '';
  const verification = Object.entries({ yandex: 'yandex-verification', google: 'google-site-verification', bing: 'msvalidate.01' })
    .filter(([key]) => site.seo.verification?.[key])
    .map(([key, name]) => `<meta name="${name}" content="${escape(site.seo.verification[key])}">`).join('\n  ');
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="${index ? 'index, follow, max-image-preview:large' : 'noindex, follow'}">
  <meta name="theme-color" content="#e8f3fc">
  <title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">
  <link rel="canonical" href="${escape(canonical)}">
  ${verification}
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:site_name" content="${escape(site.name)}">
  <meta property="og:url" content="${escape(canonical)}">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">${imageUrl ? `
  <meta property="og:image" content="${escape(imageUrl)}">
  <meta property="og:image:alt" content="${escape(site.name)} — консультации и разбор учебных заданий">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">` : ''}
  <link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
  ${structuredData ? `<script type="application/ld+json">${jsonLd(structuredData)}</script>` : ''}
  ${styles.map((style) => `<link rel="stylesheet" href="${root}styles/${style}">`).join('\n  ')}
  ${scripts.map((script) => `<script src="${root}scripts/${script}" defer></script>`).join('\n  ')}
</head>
<body id="top">
${body}
</body>
</html>
`;
}
