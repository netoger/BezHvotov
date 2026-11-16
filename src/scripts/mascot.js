window.createMascotController = function createMascotController(scene) {
  const drawing = scene.querySelector('.mascot-drawing');
  const svg = drawing.querySelector('svg');
  const motion = svg.querySelector('[data-costume-motion]');
  const eyes = svg.querySelector('#hedgehog-eyes');
  const button = svg.querySelector('[data-pet]');
  const status = scene.querySelector('[data-pet-status]');
  const layers = [...svg.querySelectorAll('[data-costume]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 69.01rem) and (any-hover: hover) and (any-pointer: fine)');
  const listeners = new AbortController();
  const animations = [];
  const touchPointers = new Set();
  let selectedId = svg.dataset.dressed;
  let phase = 'idle';
  let revision = 0;
  let pendingPet = false;
  let visible = false;
  let pointer = null;
  let gesture = null;
  let center = null;
  let frame = 0;
  let petTimer = 0;
  let settleTimer = 0;
  let readingTimer = 0;
  let x = 0;
  let y = 0;

  function listen(target, event, handler, options = {}) {
    target.addEventListener(event, handler, { ...options, signal: listeners.signal });
  }

  function paint() {
    drawing.style.setProperty('--gaze-x', x.toFixed(2) + 'px');
    drawing.style.setProperty('--gaze-y', y.toFixed(2) + 'px');
  }

  function resetGaze() {
    drawing.classList.remove('is-reading', 'is-counting');
    cancelAnimationFrame(frame);
    frame = 0;
    x = 0;
    y = 0;
    paint();
  }

  function animateGaze() {
    frame = 0;
    let targetX = 0;
    let targetY = 0;
    if (pointer) {
      if (!center) {
        const rect = eyes.getBoundingClientRect();
        center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
      const dx = pointer.x - center.x;
      const dy = pointer.y - center.y;
      const distance = Math.max(120, Math.hypot(dx, dy));
      targetX = dx / distance * 10.5;
      targetY = dy / distance * 8;
    }
    const settled = Math.abs(targetX - x) < .05 && Math.abs(targetY - y) < .05;
    x = settled ? targetX : x + (targetX - x) * .14;
    y = settled ? targetY : y + (targetY - y) * .14;
    paint();
    if (!settled) schedule();
  }

  function sceneVisible() {
    const box = drawing.getBoundingClientRect();
    return box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth;
  }

  function schedule() {
    const occupied = (selectedId === 'humanities' || selectedId === 'economics') && phase === 'idle' && !pointer && visible && !document.hidden;
    if (occupied) {
      cancelAnimationFrame(frame);
      frame = 0;
      x = selectedId === 'economics' ? -3 : 0;
      y = selectedId === 'economics' ? 8 : 7;
      paint();
      drawing.classList.toggle('is-reading', selectedId === 'humanities');
      drawing.classList.toggle('is-counting', selectedId === 'economics');
      return;
    }
    drawing.classList.remove('is-reading', 'is-counting');
    if (!frame && phase === 'idle' && visible && !document.hidden && desktop.matches && !reduced.matches) {
      frame = requestAnimationFrame(animateGaze);
    }
  }

  function refreshPosition() {
    center = null;
    if (pointer) {
      const bounds = scene.getBoundingClientRect();
      if (pointer.x < bounds.left || pointer.x > bounds.right || pointer.y < bounds.top || pointer.y > bounds.bottom) {
        pointer = null;
      }
    }
    schedule();
  }

  function syncLayers() {
    for (const layer of layers) {
      layer.toggleAttribute('data-costume-hidden', layer.dataset.costume !== selectedId);
      layer.removeAttribute('data-costume-exit');
    }
  }

  function clearEffects() {
    revision++;
    pendingPet = false;
    clearTimeout(petTimer);
    clearTimeout(settleTimer);
    clearTimeout(readingTimer);
    pointer = null;
    animations.splice(0).forEach((animation) => animation.cancel());
    drawing.classList.remove('is-petting', 'is-settling', 'law-guilty', 'law-acquitted');
    status.textContent = '';
    phase = 'idle';
    syncLayers();
    resetGaze();
    center = null;
  }

  function suspend() {
    pointer = null;
    gesture = null;
    touchPointers.clear();
    clearEffects();
  }

  function pet() {
    if (document.hidden) return;
    if (phase === 'changing') {
      pendingPet = true;
      return;
    }
    if (phase !== 'idle') return;
    phase = 'petting';
    resetGaze();
    const duration = selectedId === 'law' ? 2800 : selectedId === 'economics' ? 2600 : (reduced.matches ? 620 : 1300);
    drawing.style.setProperty('--pet-duration', (reduced.matches ? 620 : 1300) + 'ms');
    drawing.classList.add('is-petting');
    if (selectedId === 'law') {
      const guilty = Math.random() < .5;
      drawing.classList.add(guilty ? 'law-guilty' : 'law-acquitted');
      status.textContent = guilty ? 'Виновен!' : 'Оправдан!';
    } else {
      status.textContent = 'Ёжик доволен';
    }
    if (!reduced.matches && (selectedId === 'economics' || selectedId === 'law')) {
      settleTimer = setTimeout(() => drawing.classList.add('is-settling'), duration - 420);
    }
    petTimer = setTimeout(() => {
      clearEffects();
      refreshPosition();
    }, duration);
  }

  function playChange(previousId, panel) {
    if (reduced.matches || document.hidden || !sceneVisible() || typeof motion.animate !== 'function') {
      refreshPosition();
      return;
    }
    phase = 'changing';
    const currentRevision = revision;
    const duration = 620;
    const easing = 'cubic-bezier(.4,0,.2,1)';
    const add = (element, frames, options) => animations.push(element.animate(frames, options));
    add(motion, [
      { transform: 'none' },
      { transform: 'translateY(-1px)', offset: .5 },
      { transform: 'none' },
    ], { duration, easing });
    for (const layer of layers) {
      const id = layer.dataset.costume;
      if (layer.dataset.costumeSlot === 'effect') continue;
      if (id === previousId && id !== selectedId) {
        layer.setAttribute('data-costume-exit', '');
        layer.removeAttribute('data-costume-hidden');
        add(layer, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing, fill: 'forwards' });
      }
      if (id === selectedId && id !== previousId) {
        add(layer, [
          { opacity: 0, transform: 'translateY(2px)' },
          { opacity: 1, transform: 'none' },
        ], { delay: 150, duration: 470, easing, fill: 'backwards' });
      }
    }
    if (selectedId !== 'law') {
      for (const cap of svg.querySelectorAll('.mascot-cap')) {
        add(cap, [
          { transform: 'none' }, { transform: 'translateY(-.8px)', offset: .5 }, { transform: 'none' },
        ], { duration, easing });
      }
      add(svg.querySelector('.mascot-tassel'), [
        { transform: 'none' }, { transform: 'rotate(-2deg)', offset: .45 }, { transform: 'none' },
      ], { duration, easing });
    }
    if (panel && typeof panel.animate === 'function') add(panel, [{ opacity: .55 }, { opacity: 1 }], { duration: 380, easing });
    Promise.all(animations.map((animation) => animation.finished)).then(() => {
      if (revision !== currentRevision) return;
      const delayed = pendingPet;
      clearEffects();
      if (delayed) pet();
      else refreshPosition();
    }).catch((error) => {
      if (error.name !== 'AbortError') console.error(error);
      if (revision === currentRevision) clearEffects();
    });
  }

  function setCostume(nextId, { animate = false, panel } = {}) {
    const previousId = selectedId;
    clearEffects();
    selectedId = nextId;
    svg.dataset.dressed = nextId;
    svg.setAttribute('viewBox', nextId === 'economics' ? '140 75 390 355' : '140 75 320 355');
    svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
    syncLayers();
    if (animate) playChange(previousId, panel);
    else refreshPosition();
  }

  listen(scene, 'pointermove', (event) => {
    if (event.pointerType !== 'mouse' || !visible || !desktop.matches || reduced.matches) return;
    pointer = { x: event.clientX, y: event.clientY };
    clearTimeout(readingTimer);
    if (selectedId === 'humanities' || selectedId === 'economics') {
      readingTimer = setTimeout(() => { pointer = null; schedule(); }, 1800);
    }
    schedule();
  }, { passive: true });
  listen(scene, 'pointerleave', () => {
    clearTimeout(readingTimer);
    pointer = null;
    schedule();
  });

  listen(window, 'pointerdown', (event) => {
    if (event.pointerType === 'touch') touchPointers.add(event.pointerId);
    if (gesture && touchPointers.size > 1) gesture.interrupted = true;
    if (!event.isPrimary || !button.contains(event.target)) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, interrupted: touchPointers.size > 1 };
  }, { capture: true, passive: true });
  function trackGesture(event) {
    if (gesture?.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 10) gesture.interrupted = true;
  }
  listen(window, 'pointermove', trackGesture, { capture: true, passive: true });
  listen(window, 'pointerup', (event) => {
    trackGesture(event);
    touchPointers.delete(event.pointerId);
  }, { capture: true, passive: true });
  listen(window, 'pointercancel', (event) => {
    touchPointers.delete(event.pointerId);
    if (gesture?.id === event.pointerId) gesture.interrupted = true;
  }, { capture: true, passive: true });
  listen(button, 'click', (event) => {
    if (event.detail > 0 && gesture) {
      const interrupted = gesture.interrupted;
      gesture = null;
      if (interrupted) return;
    }
    pet();
  });
  listen(button, 'keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (!event.repeat) pet();
  });

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) suspend();
    else refreshPosition();
  });
  observer.observe(drawing);
  const resize = new ResizeObserver(refreshPosition);
  resize.observe(drawing);
  listen(window, 'resize', refreshPosition, { passive: true });
  listen(window, 'scroll', refreshPosition, { passive: true });
  listen(window, 'blur', suspend);
  listen(window, 'focus', refreshPosition);
  listen(window, 'pagehide', suspend);
  function resumePreferences() {
    suspend();
    if (!document.hidden) refreshPosition();
  }
  listen(document, 'visibilitychange', resumePreferences);
  listen(reduced, 'change', resumePreferences);
  listen(desktop, 'change', resumePreferences);
  button.setAttribute('role', 'button');
  button.setAttribute('tabindex', '0');
  button.setAttribute('aria-label', 'Погладить ёжика');

  function destroy() {
    listeners.abort();
    observer.disconnect();
    resize.disconnect();
    suspend();
    for (const name of ['role', 'tabindex', 'aria-label']) button.removeAttribute(name);
  }

  return { setCostume, pet, resetGaze, refreshPosition, cancelEffects: suspend, destroy };
};
