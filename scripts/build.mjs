import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, loadDirections } from './content.mjs';
import { assembleMascot } from './mascot-assets.mjs';
import { documentPage, home } from '../src/templates/home.mjs';
import { robotsText, sitemapXml } from '../src/templates/seo.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
const [{ site, documents }, directions] = await Promise.all([loadContent(), loadDirections()]);
if (process.argv.includes('--preview')) site.seo.indexable = false;
const defaultCostume = directions.items.find(({ id }) => id === directions.defaultId).costumeId;
const mascot = await assembleMascot(defaultCostume, directions.items.map(({ costumeId }) => costumeId));
const staging = await mkdtemp(join(root, '.build-'));
const next = join(staging, 'next');
const previous = join(staging, 'previous');
let preservePrevious = false;

async function copyVersioned(directory, files) {
  await mkdir(join(next, directory), { recursive: true });
  return Promise.all(files.map(async (file) => {
    const data = await readFile(join(root, 'src', directory, file));
    const hash = createHash('sha256').update(data).digest('hex').slice(0, 10);
    const [name, extension] = file.split('.');
    const filename = `${name}.${hash}.${extension}`;
    await writeFile(join(next, directory, filename), data);
    return filename;
  }));
}

try {
  const [styles, scripts] = await Promise.all([
    copyVersioned('styles', ['base.css', 'scene.css', 'mascot.css', 'directions.css']),
    copyVersioned('scripts', ['mascot.js', 'directions.js', 'reveal.js']),
    cp(join(root, 'src/assets'), join(next, 'assets'), { recursive: true }),
  ]);
  const now = Date.now();
  await writeFile(join(next, 'index.html'), home({ site, mascot, directions, styles, scripts, now, image: './assets/social.jpg' }));
  await writeFile(join(next, 'robots.txt'), robotsText(site));
  await writeFile(join(next, 'sitemap.xml'), sitemapXml(site));
  for (const document of documents) {
    await mkdir(join(next, document.slug), { recursive: true });
    await writeFile(join(next, document.slug, 'index.html'), documentPage({ site, document, styles: styles.slice(0, 1) }));
  }

  let hasPrevious = false;
  try {
    await rename(dist, previous);
    hasPrevious = true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  try {
    await rename(next, dist);
  } catch (error) {
    if (hasPrevious) {
      try {
        await rename(previous, dist);
      } catch (restoreError) {
        preservePrevious = true;
        throw new AggregateError([error, restoreError], `Предыдущая сборка сохранена в ${previous}`);
      }
    }
    throw error;
  }
} finally {
  if (!preservePrevious) {
    const [actualStaging, actualRoot] = await Promise.all([realpath(staging), realpath(root)]);
    if (actualStaging === join(actualRoot, basename(staging))) {
      await rm(actualStaging, { recursive: true, force: true });
    }
  }
}

console.log('Сборка готова в dist/');
