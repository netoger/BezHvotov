import { brand, escape, icon, layout, telegram } from './layout.mjs';
import { allDirections, directionPanels, directionTabs } from './directions.mjs';
import { homeStructuredData } from './seo.mjs';

const rubles = new Intl.NumberFormat('ru-RU');
const dateFormat = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'long', timeStyle: 'short' });
const price = (amount) => amount === 0 ? 'Бесплатно' : `${rubles.format(amount)} ₽`;

function priceRow(item, now) {
  const active = item.promotion && Date.parse(item.promotion.startsAt) <= now && now < Date.parse(item.promotion.endsAt);
  const amount = active ? item.promotion.amount : item.amount;
  return `<div class="price-row">
    <dt>${escape(item.name)}${item.unit ? ` <small>${escape(item.unit)}</small>` : ''}
      ${active ? `<small class="price-promotion">${escape(item.promotion.conditions)} · до ${dateFormat.format(Date.parse(item.promotion.endsAt))} (МСК)</small>` : ''}
    </dt>
    <dd>${active ? `<del>${price(item.amount)}</del> ` : ''}${item.from ? '<span>от</span> ' : ''}${price(amount)}</dd>
  </div>`;
}

function priceList(pricing, now) {
  return pricing.groups.map((group) => `
    ${group.title ? `<h3 class="price-category">${escape(group.title)}</h3>` : ''}
    <dl class="price-list">${group.items.filter((item) => item.visible !== false).map((item) => priceRow(item, now)).join('\n')}</dl>`).join('');
}

export function home({ site, mascot, directions, styles, scripts, now, image }) {
  const defaultDirection = directions.items.find(item => item.id === directions.defaultId);
  const priceCards = directions.items.map(item => `<div class="direction-price" data-direction-price="${escape(item.id)}"${item.id === directions.defaultId ? '' : ' hidden'}>
    <p class="price-direction">${escape(item.title)}</p>
    ${priceList(item.pricing, now)}
    <p class="price-note">${escape(item.pricing.note)}</p>
  </div>`).join('');
  const developers = site.developers;
  const body = `<a class="skip" href="#main">К содержанию</a>
<div class="site">
  <header class="site-header">
    <div class="wrap header-inner">
      ${brand(site, './', '#top')}
      <figure class="founders-quote">
        <blockquote>${escape(site.motto.text)}</blockquote>
        <figcaption><span>${escape(site.motto.note)}</span><cite>— ${escape(site.motto.author)}</cite></figcaption>
      </figure>
    </div>
  </header>
  <main id="main">
    <div class="scene" data-scene data-active-direction="${escape(directions.defaultId)}">
    <section class="main-scene wrap" aria-labelledby="heading">
      <div class="intro">
        <h1 id="heading">${escape(site.name)}</h1>
        <p>${escape(site.description)}</p>
      </div>
      ${directionTabs(directions)}
      <div class="scene-grid">
        <div class="character">
          <div class="character-art">
            <div class="mascot-drawing">
              ${mascot}
            </div>
          </div>
          <div class="character-navigation" data-character-navigation hidden>
            <button type="button" class="character-arrow" data-direction-step="-1" aria-label="Предыдущее направление">${icon('back')}</button>
            <div class="character-caption"><span data-direction-count>01 / ${String(directions.items.length).padStart(2, '0')}</span><strong data-direction-caption>${escape(defaultDirection.label)}</strong></div>
            <button type="button" class="character-arrow" data-direction-step="1" aria-label="Следующее направление">${icon('forward')}</button>
          </div>
          <span class="visually-hidden" role="status" data-pet-status></span>
          <span class="visually-hidden" role="status" data-direction-status></span>
        </div>
        ${directionPanels(directions)}
        <div class="scene-telegram">${telegram(site, 'telegram-button')}</div>
        <section class="prices" id="prices" aria-labelledby="prices-heading">
          <h2 id="prices-heading">Стоимость</h2>
          ${priceCards}
        </section>
      </div>
      <div class="scene-common">
        <section class="services" id="services" aria-labelledby="services-heading">
          <h2 id="services-heading">Форматы помощи</h2>
          <ul class="service-list">
            ${site.services.filter((service) => service.visible !== false).map((service) => `<li>
              <h3>${escape(service.name)}</h3><p>${escape(service.description)}</p>
            </li>`).join('\n')}
          </ul>
        </section>
        <section class="how-to" aria-labelledby="contact-heading">
          <h2 id="contact-heading">${escape(site.contact.title)}</h2>
          <p>${escape(site.contact.description)}</p>
        </section>
      </div>
      ${allDirections(directions)}
    </section>
    <div class="floor"><div class="wrap"><a href="#faq"><span>Вопросы и условия</span><span class="floor-arrow">${icon('down')}</span></a></div></div>
    </div>
    <section class="underfloor" id="faq" aria-labelledby="faq-heading">
      <div class="wrap underfloor-inner" data-reveal>
        <div class="faq-intro"><h2 id="faq-heading">Частые вопросы</h2></div>
        <div class="faq-list">
          ${site.questions.map(({ question, answer }) => `<details><summary>${escape(question)}<span aria-hidden="true"></span></summary><p>${escape(answer)}</p></details>`).join('\n')}
        </div>
      </div>
    </section>
  </main>
  <footer class="footer-panel">
    <div class="wrap footer">
        <div class="footer-brand">
          ${brand(site, './', '#top')}
          <a class="footer-channel" href="${escape(site.telegram)}">Канал в Telegram ${icon('outbound')}</a>
        </div>
        <div class="footer-docs">
          <h2>Документы</h2>
          ${site.documents.map(({ slug, title }) => `<a href="./${slug}/index.html">${escape(title)}</a>`).join('')}
        </div>
        ${developers.description || developers.links.length ? `<div class="footer-developers">
          <h2>Разработчики</h2>
          ${developers.description ? `<p>${escape(developers.description)}</p>` : ''}
          ${developers.links.map(({ name, href }) => `<a href="${escape(href)}">${escape(name)} ${icon('outbound')}</a>`).join('')}
        </div>` : ''}
        <div class="footer-top"><a href="#top">Наверх ${icon('up')}</a></div>
    </div>
  </footer>
</div>`;
  return layout({ site, title: site.seo.title, description: site.seo.description, styles, scripts, body, image, indexable: true, structuredData: homeStructuredData(site, directions) });
}

export function documentPage({ site, document, styles }) {
  const body = `<a class="skip" href="#main">К содержанию</a>
  <header class="site-header"><div class="wrap header-inner">
    ${brand(site, '../', 'index.html')}<a class="header-contact" href="../index.html#faq">К вопросам ${icon('forward')}</a>
  </div></header>
  <main id="main" class="wrap document">
    <h1>${escape(document.title)}</h1>
    <p class="document-intro">${escape(document.intro)}</p>
    ${document.updated ? `<p class="document-date">Дата редакции — <time datetime="${escape(document.updated)}">${escape(document.updated)}</time></p>` : ''}
    ${document.sections.map(({ title, paragraphs }) => `<section><h2>${escape(title)}</h2>${paragraphs.map((paragraph) => `<p>${escape(paragraph)}</p>`).join('')}</section>`).join('')}
    ${telegram(site, 'telegram-button')}
  </main>`;
  return layout({ site, title: `${document.title} — ${site.name}`, description: document.description, root: '../', styles, body, path: `/${document.slug}/index.html` });
}
