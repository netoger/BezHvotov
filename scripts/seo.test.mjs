import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, loadDirections } from './content.mjs';
import { home, documentPage } from '../src/templates/home.mjs';
import { homeStructuredData, jsonLd, robotsText, sitemapXml } from '../src/templates/seo.mjs';

const { site, documents } = await loadContent();
const directions = await loadDirections();
const render = (settings) => home({ site: settings, directions, mascot: '<svg></svg>', styles: [], scripts: [], now: Date.now(), image: './assets/social.jpg' });

test('Публичная главная индексируется, URL и превью используют подтверждённый домен', () => {
  const html = render(site);
  assert.match(html, /name="robots" content="index, follow, max-image-preview:large"/);
  assert.match(html, /rel="canonical" href="https:\/\/beshvostov\.ru\/"/);
  assert.match(html, /property="og:image" content="https:\/\/beshvostov\.ru\/assets\/social\.jpg"/);
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(data['@graph'].filter(x => x['@type'] === 'Service').length, 6);
  assert.equal(data['@graph'][0].sameAs[0], site.telegram);
  assert.ok(!JSON.stringify(data).includes('aggregateRating'));
  assert.ok(!JSON.stringify(data).includes('offers'));
  assert.match(robotsText(site), /Allow: \/\n/);
  assert.equal((sitemapXml(site).match(/<loc>/g) ?? []).length, 1);
  assert.ok(!sitemapXml(site).includes('?direction='));
});

test('Тестовая сборка закрыта, юридические страницы не добавлены в индекс', () => {
  const preview = structuredClone(site);
  preview.seo.indexable = false;
  assert.match(render(preview), /name="robots" content="noindex, follow"/);
  assert.match(robotsText(preview), /Disallow: \/\n/);
  assert.ok(!sitemapXml(preview).includes('<loc>'));
  for (const document of documents) {
    const html = documentPage({ site, document, styles: [] });
    assert.match(html, /name="robots" content="noindex, follow"/);
    assert.ok(html.includes(`https://beshvostov.ru/${document.slug}/index.html`));
  }
});

test('Тексты и коды подтверждения не могут закрыть HTML или JSON-LD', () => {
  const altered = structuredClone(site);
  altered.name = '</script><script>alert(1)</script>';
  altered.seo.verification.yandex = '"><script>alert(2)</script>';
  const html = render(altered);
  assert.ok(!html.includes('<script>alert('));
  const data = homeStructuredData(altered, directions);
  assert.ok(!jsonLd(data).includes('</script>'));
  assert.equal(JSON.parse(jsonLd(data))['@graph'][0].name, altered.name);
  assert.match(html, /yandex-verification" content="&quot;&gt;&lt;script&gt;/);
});
