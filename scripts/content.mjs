import { readFile } from 'node:fs/promises';
import { costumeIds } from './mascot-assets.mjs';

function requireField(condition, field) {
  if (!condition) throw new Error(`Проверьте поле ${field}`);
}

function string(value, field) {
  requireField(typeof value === 'string' && value.trim().length > 0, field);
}

function array(value, field, { optional = false } = {}) {
  requireField(Array.isArray(value) && (optional || value.length > 0), field);
  return value;
}

function url(value, field) {
  string(value, field);
  requireField(URL.canParse(value), field);
  const link = new URL(value);
  requireField(link.protocol === 'https:' && !link.username && !link.password, field);
  return link;
}

function id(value, field, used) {
  requireField(typeof value === 'string' && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value) && !used.has(value), field);
  used.add(value);
}

function amount(value, field) {
  requireField(Number.isSafeInteger(value) && value >= 0, field);
}

function date(value, field) {
  requireField(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/.test(value), field);
  const number = Date.parse(value);
  const back = new Date(number + 3 * 60 * 60 * 1000);
  requireField(Number.isFinite(number) && back.toISOString().slice(0, 19) === value.slice(0, 19), field);
  return number;
}

function optionalBoolean(value, field) {
  requireField(value === undefined || typeof value === 'boolean', field);
}

async function json(path) {
  try {
    return JSON.parse((await readFile(new URL(path, import.meta.url), 'utf8')).replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`${path}: ${error.message}`, { cause: error });
  }
}

export function validatePricing(pricing, field = "pricing") {
  string(pricing?.note, `${field}.note`);
  const priceIds = new Set();
  const groups = array(pricing.groups, `${field}.groups`);
  for (const [index, group] of groups.entries()) {
    const groupField = `${field}.groups[${index}]`;
    requireField(typeof group.title === 'string', `${groupField}.title`);
    for (const [itemIndex, item] of array(group.items, `${groupField}.items`).entries()) {
      const row = `${groupField}.items[${itemIndex}]`;
      id(item.id, `${row}.id`, priceIds);
      string(item.name, `${row}.name`);
      amount(item.amount, `${row}.amount`);
      if (item.unit !== undefined) string(item.unit, `${row}.unit`);
      optionalBoolean(item.visible, `${row}.visible`);
      optionalBoolean(item.from, `${row}.from`);
      requireField(!item.from || item.amount > 0, `${row}.from`);
      if (item.promotion) {
        const promotion = item.promotion;
        amount(promotion.amount, `${row}.promotion.amount`);
        requireField(promotion.amount > 0 && promotion.amount < item.amount, `${row}.promotion.amount`);
        string(promotion.conditions, `${row}.promotion.conditions`);
        const start = date(promotion.startsAt, `${row}.promotion.startsAt`);
        const end = date(promotion.endsAt, `${row}.promotion.endsAt`);
        requireField(end > start, `${row}.promotion.endsAt`);
      }
    }
  }

  return pricing;
}

export function validateDirections(directions) {
  requireField(directions?.schemaVersion === 1, 'directions.schemaVersion (поддерживается версия 1)');
  string(directions.formats, 'directions.formats');
  const items = array(directions.items, 'directions.items');
  const used = new Set();
  for (const [index, item] of items.entries()) {
    const field = `directions.items[${index}]`;
    requireField(item && typeof item === 'object', field);
    requireField(typeof item.id === 'string' && /^[a-z]+(?:-[a-z]+)*$/.test(item.id), `${field}.id`);
    id(item.id, `${field}.id`, used);
    for (const key of ['label', 'title', 'description']) string(item[key], `${field}.${key}`);
    for (const key of ['subjects', 'technologies', 'helpExamples']) {
      for (const entry of array(item[key], `${field}.${key}`, { optional: key === 'technologies' })) {
        string(entry, `${field}.${key}`);
      }
    }
    requireField(item.specialistNote === undefined || typeof item.specialistNote === 'string', `${field}.specialistNote`);
    requireField(typeof item.enabled === 'boolean', `${field}.enabled`);
    requireField(costumeIds.includes(item.costumeId), `${field}.costumeId`);
    validatePricing(item.pricing, `${field}.pricing`);
    if (item.description.length > 180 || item.subjects.length < 4 || item.subjects.length > 6 || item.helpExamples.length !== 3) {
      console.warn(`Проверьте вёрстку направления «${item.id}»: длина описания или количество пунктов отличаются от ориентиров ТЗ.`);
    }
  }
  const enabled = items.filter((item) => item.enabled);
  requireField(enabled.some((item) => item.id === directions.defaultId), 'directions.defaultId (нужно включённое направление)');
  return { ...directions, items: enabled };
}

export async function loadDirections() {
  return validateDirections(await json('../content/directions.json'));
}

export async function loadContent() {
  const site = await json('../content/site.json');
  string(site.name, 'name');
  string(site.description, 'description');
  const origin = url(site.seo?.url, 'seo.url');
  requireField(origin.pathname === '/' && !origin.search && !origin.hash && !origin.port && origin.hostname.includes('.') && !/^(localhost|127\.|0\.)/.test(origin.hostname), 'seo.url (публичный HTTPS-домен без пути)');
  string(site.seo.title, 'seo.title');
  string(site.seo.description, 'seo.description');
  requireField(typeof site.seo.indexable === 'boolean', 'seo.indexable');
  for (const key of ['yandex', 'google', 'bing']) {
    requireField(typeof site.seo.verification?.[key] === 'string', `seo.verification.${key}`);
  }
  string(site.motto?.text, 'motto.text');
  string(site.motto?.note, 'motto.note');
  string(site.motto?.author, 'motto.author');
  string(site.telegramLabel, 'telegramLabel');
  const channel = url(site.telegram, 'telegram');
  requireField(channel.hostname === 't.me' && /^\/[a-zA-Z0-9_]+\/?$/.test(channel.pathname), 'telegram');
  string(site.contact?.title, 'contact.title');
  string(site.contact?.description, 'contact.description');

  const serviceIds = new Set();
  for (const [index, service] of array(site.services, 'services').entries()) {
    const field = `services[${index}]`;
    id(service.id, `${field}.id`, serviceIds);
    string(service.name, `${field}.name`);
    string(service.description, `${field}.description`);
    optionalBoolean(service.visible, `${field}.visible`);
  }

  validatePricing(site.pricing);

  for (const [index, question] of array(site.questions, 'questions').entries()) {
    string(question.question, `questions[${index}].question`);
    string(question.answer, `questions[${index}].answer`);
  }

  const slugs = new Set(['assets', 'styles', 'scripts']);
  const documents = [];
  for (const [index, link] of array(site.documents, 'documents').entries()) {
    id(link.slug, `documents[${index}].slug`, slugs);
    string(link.title, `documents[${index}].title`);
    const record = await json(`../content/legal/${link.slug}.json`);
    const field = `content/legal/${link.slug}.json`;
    requireField(['draft', 'approved'].includes(record.status), `${field}.status`);
    string(record.description, `${field}.description`);
    string(record.intro, `${field}.intro`);
    if (record.status === 'approved' || record.updated !== undefined) {
      date(`${record.updated}T00:00:00+03:00`, `${field}.updated`);
    }
    for (const [sectionIndex, section] of array(record.sections, `${field}.sections`).entries()) {
      const sectionField = `${field}.sections[${sectionIndex}]`;
      string(section.title, `${sectionField}.title`);
      for (const paragraph of array(section.paragraphs, `${sectionField}.paragraphs`)) {
        string(paragraph, `${sectionField}.paragraphs`);
      }
    }
    documents.push({ ...record, ...link });
  }

  requireField(typeof site.developers?.description === 'string', 'developers.description');
  for (const [index, link] of array(site.developers.links, 'developers.links', { optional: true }).entries()) {
    string(link.name, `developers.links[${index}].name`);
    url(link.href, `developers.links[${index}].href`);
  }
  return { site, documents };
}
