import { readFile } from 'node:fs/promises';

export const costumeIds = ['humanities', 'economics', 'it', 'law', 'engineering', 'mathematics'];
const slots = ['back', 'headwear', 'body', 'front', 'effect'];
const svgRoot = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="140 75 320 355">';
const tags = new Set(['g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'defs', 'clipPath', 'linearGradient', 'radialGradient', 'stop', 'use']);
const attributes = new Set(['id', 'class', 'd', 'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-opacity', 'opacity', 'transform', 'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'points', 'clip-path', 'href', 'gradientUnits', 'gradientTransform', 'offset', 'stop-color', 'stop-opacity']);

function scanDrawing(source, fail) {
  const stack = [];
  const ids = [];
  const links = [];
  for (const token of source.match(/<[^<>]*>|[^<>]+|[<>]/g) ?? []) {
    if (!token.trim()) continue;
    const closing = token.match(/^<\/(\w+)>$/);
    if (closing) {
      if (stack.pop() !== closing[1]) fail(`несогласованный закрывающий тег ${token}`);
      continue;
    }
    const opening = token.match(/^<(\w+)((?:\s+[\w-]+="[^"<>&]*")*)\s*(\/?)>$/);
    if (!opening || !tags.has(opening[1])) fail(`недопустимый фрагмент ${token.slice(0, 80)}`);
    if (!opening[3]) stack.push(opening[1]);
    const seen = new Set();
    for (const [, key, value] of opening[2].matchAll(/([\w-]+)="([^"]*)"/g)) {
      if (!attributes.has(key) || seen.has(key)) fail(`недопустимый атрибут ${key}`);
      seen.add(key);
      if (key === 'id') ids.push(value);
      if (key === 'href' || /url\s*\(/i.test(value)) {
        const ref = value.match(key === 'href' ? /^#([\w-]+)$/ : /^url\(#([\w-]+)\)$/);
        if (!ref) fail(`ожидалась локальная ссылка, получено ${value}`);
        links.push(ref[1]);
      }
    }
  }
  if (stack.length) fail(`не закрыт тег ${stack.at(-1)}`);
  return { ids, links };
}

export function parseCostume(source, key) {
  const fail = (message) => { throw new Error(`Костюм ${key}.svg: ${message}`); };
  const lines = source.trim().split(/\r?\n/);
  if (lines.shift() !== svgRoot || lines.pop() !== '</svg>') fail('ожидается общая система координат 140 75 320 355');
  const layers = new Map();
  const ids = new Set();
  const links = [];
  while (lines.length) {
    const header = lines.shift();
    if (!header.trim()) continue;
    const name = header.match(/^  <g data-slot="([a-z]+)">$/)?.[1];
    if (!slots.includes(name) || layers.has(name)) fail(`неверный слот: ${header.trim()}`);
    const end = lines.indexOf('  </g>');
    if (end < 0) fail(`не закрыт слот ${name}`);
    const drawing = lines.splice(0, end + 1).slice(0, -1).join('\n');
    const parts = scanDrawing(drawing, fail);
    for (const id of parts.ids) {
      if (!/^[a-z][a-z0-9-]*$/.test(id) || !id.startsWith(`${key}-`) || ids.has(id)) fail(`проверьте уникальность и префикс ID ${id}`);
      ids.add(id);
    }
    links.push(...parts.links);
    layers.set(name, drawing);
  }
  if (!layers.has('front')) fail('обязателен слот front');
  for (const link of links) if (!ids.has(link)) fail(`не найдена цель ссылки #${link}`);
  return layers;
}

export async function assembleMascot(defaultCostume, activeCostumes) {
  const base = new URL('../src/assets/mascot/', import.meta.url);
  const mascot = await readFile(new URL('hedgehog.svg', base), 'utf8');
  const costumes = new Map(await Promise.all(costumeIds.map(async (key) => {
    const file = new URL(`costumes/${key}.svg`, base);
    return [key, parseCostume(await readFile(file, 'utf8'), key)];
  })));
  const combined = slots.reduce((result, slot) => {
    const marker = `<!-- costume:${slot} -->`;
    if (result.split(marker).length !== 2) throw new Error(`В hedgehog.svg нужна одна точка вставки ${marker}`);
    const layers = [...new Set(activeCostumes)].filter((key) => costumes.get(key).has(slot)).map((key) => {
      const current = key === defaultCostume ? '' : ' data-costume-hidden';
      return `<g data-costume="${key}" data-costume-slot="${slot}" aria-hidden="true"${current}>\n${costumes.get(key).get(slot)}\n</g>`;
    });
    return result.replace(marker, layers.join('\n'));
  }, mascot);
  const ids = [...combined.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  if (new Set(ids).size !== ids.length) throw new Error('В собранном SVG есть повторяющиеся ID');
  const framed = defaultCostume === 'economics' ? combined.replace('viewBox="140 75 320 355"', 'viewBox="140 75 390 355"') : combined;
  return framed.replace('<svg ', `<svg preserveAspectRatio="xMidYMax meet" data-dressed="${defaultCostume}" `);
}
