const createModalController = () => {
  const resolveTarget = (trigger, attribute) => {
    if (!trigger) return null;
    const selector = trigger.getAttribute(attribute);
    if (!selector) return null;
    try {
      return document.querySelector(selector);
    } catch (error) {
      console.warn('LifeGoalApp: Invalid selector in', attribute, selector, error);
      return null;
    }
  };

  const openModal = (modal) => {
    if (!modal) return;
    if (modal instanceof HTMLDialogElement) {
      if (!modal.open) {
        modal.showModal();
      }
      return;
    }
    modal.setAttribute('open', '');
    modal.classList.add('is-open');
    modal.removeAttribute('aria-hidden');
  };

  const closeModal = (modal) => {
    if (!modal) return;
    if (modal instanceof HTMLDialogElement) {
      if (modal.open) {
        modal.close();
      }
      return;
    }
    modal.removeAttribute('open');
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  };

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const openTrigger = target.closest('[data-open]');
    if (openTrigger) {
      const modal = resolveTarget(openTrigger, 'data-open');
      openModal(modal);
      return;
    }

    const closeTrigger = target.closest('[data-close]');
    if (closeTrigger) {
      const modal = resolveTarget(closeTrigger, 'data-close');
      closeModal(modal);
      return;
    }

    const activeModal = document.querySelector('.modal.is-open, dialog[open]');
    if (activeModal && target instanceof HTMLElement) {
      if (target.dataset.dismiss === 'backdrop') {
        closeModal(activeModal);
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const modal = document.querySelector('.modal.is-open, dialog[open]');
    if (!modal) return;
    event.preventDefault();
    closeModal(modal);
  });
};

const enhanceDraggables = () => {
  const draggableSelector = '[data-draggable]';
  const draggableItems = document.querySelectorAll(draggableSelector);
  draggableItems.forEach((item) => {
    if (!(item instanceof HTMLElement)) return;
    if (!item.hasAttribute('draggable')) {
      item.setAttribute('draggable', 'true');
    }
    item.addEventListener('dragstart', () => {
      item.classList.add('is-dragging');
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('is-dragging');
    });
  });
};

const initComponents = () => {
  createModalController();
  enhanceDraggables();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initComponents, { once: true });
} else {
  initComponents();
}
