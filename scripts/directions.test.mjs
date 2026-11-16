import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { loadDirections, validateDirections } from './content.mjs';
import { assembleMascot, parseCostume } from './mascot-assets.mjs';

const source = JSON.parse(await readFile(new URL('../content/directions.json', import.meta.url), 'utf8'));

test('Направления валидируются и сохраняют порядок', async () => {
  const directions = await loadDirections();
  assert.deepEqual(directions.items.map(({ id }) => id), ['humanities', 'economics', 'it', 'law', 'engineering', 'mathematics']);
  assert.equal(directions.defaultId, 'humanities');
  const changed = structuredClone(source);
  changed.items[1].enabled = false;
  assert.equal(validateDirections(changed).items.length, 5);
  changed.defaultId = 'economics';
  assert.throws(() => validateDirections(changed), /directions.defaultId/);
});

test('Сборка отклоняет неизвестную схему, дубли ключей и неизвестный костюм', () => {
  assert.throws(() => validateDirections({ ...source, schemaVersion: 2 }), /schemaVersion/);
  const changed = structuredClone(source);
  changed.items[1].id = 'humanities';
  assert.throws(() => validateDirections(changed), /items\[1\].id/);
  changed.items[1].id = 'economics';
  changed.items[1].costumeId = '../outside';
  assert.throws(() => validateDirections(changed), /costumeId/);
});

test('Все костюмы используют одну базу, локальные ссылки и уникальные ID', async () => {
  const svg = await assembleMascot('humanities', source.items.map(({ costumeId }) => costumeId));
  assert.equal([...svg.matchAll(/data-pet\b/g)].length, 1);
  assert.equal([...svg.matchAll(/id="hedgehog-eyes"/g)].length, 1);
  assert.match(svg, /data-dressed="humanities"/);
  assert.match(svg, /data-costume="it" data-costume-slot="front" aria-hidden="true" data-costume-hidden/);
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  const invalid = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="140 75 320 355">\n  <g data-slot="front">\n    <use href="https://example.com/image.svg"/>\n  </g>\n</svg>';
  assert.throws(() => parseCostume(invalid, 'it'), /локальная ссылка/);
});

test('Цена одного направления меняется независимо, неверные суммы отклоняются', () => {
  const changed = structuredClone(source);
  const other = changed.items[1].pricing.groups[0].items[1].amount;
  changed.items[0].pricing.groups[0].items[1].amount = 1234;
  const result = validateDirections(changed);
  assert.equal(result.items[0].pricing.groups[0].items[1].amount, 1234);
  assert.equal(result.items[1].pricing.groups[0].items[1].amount, other);
  changed.items[0].pricing.groups[0].items[1].amount = -1;
  assert.throws(() => validateDirections(changed), /items\[0\].pricing.groups\[0\].items\[1\].amount/);
  delete changed.items[0].pricing;
  assert.throws(() => validateDirections(changed), /pricing.note/);
});
