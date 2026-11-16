(() => {
  const panel = document.querySelector('[data-reveal]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    if (!reduced.matches && location.hash !== '#faq') panel.classList.add('revealing');
    observer.disconnect();
  }, { threshold: .12 });
  observer.observe(panel);
})();
