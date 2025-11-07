// Toggle switch behavior for any .toggle element (clicking the track toggles data-on)
document.addEventListener('click', (e) => {
  const t = e.target.closest('.toggle');
  if(!t) return;
  t.dataset.on = t.dataset.on === 'true' ? 'false' : 'true';
});

// Simple HTML5 drag & drop for widgets with [data-draggable] inside [data-grid]
(() => {
  let dragEl, placeholder;
  const grid = document.querySelector('[data-grid]');
  if(!grid) return;

  grid.addEventListener('dragstart', (e) => {
    const card = e.target.closest('[data-draggable]');
    if(!card) return;
    dragEl = card;
    placeholder = document.createElement('div');
    placeholder.style.height = `${card.offsetHeight}px`;
    placeholder.className = 'card glass';
    placeholder.style.opacity = '.2';
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => card.style.visibility = 'hidden');
  });

  grid.addEventListener('dragend', () => {
    if(!dragEl) return;
    dragEl.classList.remove('dragging');
    dragEl.style.visibility = '';
    placeholder?.remove();
    dragEl = null;
  });

  grid.addEventListener('dragover', (e) => {
    if(!dragEl) return;
    e.preventDefault();
    const after = Array.from(grid.querySelectorAll('[data-draggable]:not(.dragging)'))
      .find(el => e.clientY <= el.getBoundingClientRect().top + el.offsetHeight/2);
    if (!placeholder.isConnected) grid.insertBefore(placeholder, after || null);
  });

  grid.addEventListener('drop', (e) => {
    e.preventDefault();
    if(!dragEl) return;
    grid.insertBefore(dragEl, placeholder);
  });
})();

// Modal functionality
document.addEventListener('click', (e) => {
  const close = e.target.closest('[data-close]');
  if(close) {
    const modalSelector = close.dataset.close;
    const modal = document.querySelector(modalSelector);
    if(modal) modal.removeAttribute('open');
  }
  
  const open = e.target.closest('[data-open]');
  if(open) {
    const modalSelector = open.dataset.open;
    const modal = document.querySelector(modalSelector);
    if(modal) modal.setAttribute('open', '');
  }
});
