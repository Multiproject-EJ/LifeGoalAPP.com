// Toggle switch behavior for declarative toggles that are not controlled by React.
document.addEventListener('click', (event) => {
  const toggle = event.target.closest('.toggle');
  if (!toggle) return;
  if (toggle.dataset.controlled === 'react') return;
  const current = toggle.dataset.on === 'true';
  toggle.dataset.on = current ? 'false' : 'true';
});

// Simple HTML5 drag & drop for widgets with [data-draggable] inside [data-grid]
(() => {
  let dragEl;
  let placeholder;

  const grids = document.querySelectorAll('[data-grid]');
  if (grids.length === 0) return;

  const createPlaceholder = (height) => {
    const el = document.createElement('div');
    el.style.height = `${height}px`;
    el.className = 'card glass drag-placeholder';
    el.style.opacity = '0.25';
    return el;
  };

  grids.forEach((grid) => {
    grid.addEventListener('dragstart', (event) => {
      const card = event.target.closest('[data-draggable]');
      if (!card) return;
      dragEl = card;
      placeholder = createPlaceholder(card.offsetHeight);
      card.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      setTimeout(() => {
        card.style.visibility = 'hidden';
      });
    });

    grid.addEventListener('dragend', () => {
      if (!dragEl) return;
      dragEl.classList.remove('dragging');
      dragEl.style.visibility = '';
      placeholder?.remove();
      dragEl = undefined;
      placeholder = undefined;
    });

    grid.addEventListener('dragover', (event) => {
      if (!dragEl) return;
      event.preventDefault();
      const siblings = Array.from(grid.querySelectorAll('[data-draggable]:not(.dragging)'));
      const after = siblings.find((element) => event.clientY <= element.getBoundingClientRect().top + element.offsetHeight / 2);
      if (placeholder && !placeholder.isConnected) {
        grid.insertBefore(placeholder, after ?? null);
      } else if (placeholder && after && placeholder !== after) {
        grid.insertBefore(placeholder, after);
      }
    });

    grid.addEventListener('drop', (event) => {
      event.preventDefault();
      if (!dragEl) return;
      grid.insertBefore(dragEl, placeholder ?? null);
    });
  });
})();
