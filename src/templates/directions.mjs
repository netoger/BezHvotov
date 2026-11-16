import { escape } from './layout.mjs';

const marks = {
  humanities: '<path d="M3 5q5-2 9 1 4-3 9-1v14q-5-2-9 1-4-3-9-1ZM12 6v14"/>',
  economics: '<path d="M4 20V12h4v8m3 0V8h4v12m3 0V3h4v17M3 7l7-4 5 1 6-3"/>',
  it: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/>',
  law: '<path d="M12 3v18M7 21h10M3 7h18M5 7l-4 8h8Zm14 0-4 8h8Z"/>',
  engineering: '<path d="M3 21 21 3v18ZM11 17h6v-6ZM7 17l2 2m2-6 2 2m2-6 2 2"/>',
  mathematics: '<path d="M4 6h13L8 12l9 6H4M20 5v14"/>'
};
function mark(id) { return `<svg class="direction-mark" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${marks[id] || marks.humanities}</svg>`; }

function items(values) {
  return values.map((value) => `<li>${escape(value)}</li>`).join('');
}

function subjects(direction) {
  return `<ul class="direction-subjects">${items(direction.subjects)}</ul>
    ${direction.technologies.length ? `<ul class="direction-technologies" aria-label="Технологии">${items(direction.technologies)}</ul>` : ''}`;
}

function directionCopy(direction) {
  return `<h2>${escape(direction.title)}</h2>
    <p class="direction-description">${escape(direction.description)}</p>
    <h3>Предметы</h3>
    ${subjects(direction)}
    <h3>С чем помогаем</h3>
    <ul class="direction-examples">${items(direction.helpExamples)}</ul>
    ${direction.specialistNote?.trim() ? `<p class="direction-specialist">${escape(direction.specialistNote)}</p>` : ''}`;
}

export function directionTabs({ items: directions, defaultId }) {
  return `<div class="direction-picker" data-direction-picker hidden>
    <h2>Выберите направление</h2>
    <div class="direction-tabs" role="tablist" aria-label="Учебное направление">
      ${directions.map(({ id, label, costumeId }) => `<button type="button" id="tab-${id}" role="tab" aria-selected="${id === defaultId}" aria-controls="direction-${id}" tabindex="${id === defaultId ? 0 : -1}" data-direction="${id}" data-outfit="${costumeId}">${mark(id)}<span>${escape(label)}</span></button>`).join('\n')}
    </div>
  </div>`;
}

export function directionPanels({ items: directions, defaultId }) {
  return `<div class="direction-panels" data-direction-panels data-default-direction="${defaultId}">
    ${directions.map((direction) => `<section id="direction-${direction.id}" class="direction-panel" data-direction-panel="${direction.id}"${direction.id === defaultId ? '' : ' hidden'}>${directionCopy(direction)}</section>`).join('\n')}
    ${directions.map((direction) => `<div class="direction-panel direction-sizer" aria-hidden="true" inert>${directionCopy(direction)}</div>`).join('\n')}
  </div>`;
}

export function allDirections({ items: directions }) {
  return `<details class="all-directions">
    <summary>Все направления</summary>
    <div class="all-directions-list">
      ${directions.map((direction) => `<div><h3>${escape(direction.title)}</h3><p>${escape(direction.description)}</p>${subjects(direction)}<ul>${items(direction.helpExamples)}</ul></div>`).join('\n')}
    </div>
  </details>`;
}
