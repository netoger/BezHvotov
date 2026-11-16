(() => {
  const scene = document.querySelector('[data-scene]');
  const picker = scene.querySelector('[data-direction-picker]');
  const panels = scene.querySelector('[data-direction-panels]');
  const tabs = [...picker.querySelectorAll('[data-direction]')];
  const byId = new Map(tabs.map((tab) => [tab.dataset.direction, tab]));
  const mascot = window.createMascotController(scene);
  const fallback = panels.dataset.defaultDirection;
  let selectedId;

  for (const tab of tabs) {
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
  }

  function selectDirection(id, { animate = false, updateUrl = false } = {}) {
    if (!byId.has(id) || id === selectedId) return;
    selectedId = id;
    scene.dataset.activeDirection = id;
    for (const price of scene.querySelectorAll('[data-direction-price]')) price.hidden = price.dataset.directionPrice !== id;
    scene.querySelector('[data-direction-caption]').textContent = byId.get(id).textContent;
    scene.querySelector('[data-direction-count]').textContent = `${String(tabs.indexOf(byId.get(id)) + 1).padStart(2, '0')} / ${String(tabs.length).padStart(2, '0')}`;
    if (animate) scene.querySelector('[data-direction-status]').textContent = byId.get(id).textContent;
    for (const tab of tabs) {
      const selected = tab.dataset.direction === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
    }
    const active = byId.get(id);
    const panel = document.getElementById(active.getAttribute('aria-controls'));
    if (updateUrl && location.protocol !== 'file:') {
      const url = new URL(location.href);
      url.searchParams.set('direction', id);
      history.replaceState(history.state, '', url);
    }
    mascot.setCostume(active.dataset.outfit, { animate, panel });
  }

  function readLocation() {
    const id = new URLSearchParams(location.search).get('direction');
    selectDirection(byId.has(id) ? id : fallback);
  }

  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => {
      tab.focus({ preventScroll: true });
      selectDirection(tab.dataset.direction, { animate: true, updateUrl: true });
    });
    tab.addEventListener('keydown', (event) => {
      const next = {
        ArrowLeft: (index + tabs.length - 1) % tabs.length,
        ArrowRight: (index + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      tabs[next].focus({ preventScroll: true });
    });
  }
  const navigation = scene.querySelector('[data-character-navigation]');
  for (const arrow of navigation.querySelectorAll('[data-direction-step]')) {
    arrow.disabled = tabs.length < 2;
    arrow.addEventListener('click', () => {
      const index = tabs.indexOf(byId.get(selectedId));
      const next = (index + Number(arrow.dataset.directionStep) + tabs.length) % tabs.length;
      selectDirection(tabs[next].dataset.direction, { animate: true, updateUrl: true });
    });
  }
  navigation.hidden = false;
  readLocation();
  window.addEventListener('popstate', readLocation);
  picker.hidden = false;
})();
