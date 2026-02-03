import { supabase, requireAuth } from '../lib/supabaseClient.js';
import { mountBuildChecklist } from './BuildChecklist.js';

const DEFAULT_THEME = {
  name: 'Evergreen',
  accent: '#6ee7b7',
  accent2: '#60a5fa',
  bg: '#0f1115',
  surface: '#171a21',
  surface2: '#1e2230'
};

const THEME_PRESETS = [
  DEFAULT_THEME,
  {
    name: 'Aurora',
    accent: '#a78bfa',
    accent2: '#f472b6',
    bg: '#120f1d',
    surface: '#1b142a',
    surface2: '#231836'
  },
  {
    name: 'Sunrise',
    accent: '#fb923c',
    accent2: '#facc15',
    bg: '#1a1209',
    surface: '#26190f',
    surface2: '#2f2015'
  },
  {
    name: 'Ocean',
    accent: '#38bdf8',
    accent2: '#22d3ee',
    bg: '#091824',
    surface: '#102233',
    surface2: '#162c41'
  }
];

const boardState = {
  boards: [],
  activeBoardId: null,
  userId: null,
  sections: [],
  cards: [],
  editingCardId: null
};

function applyTheme(theme = {}) {
  const root = document.querySelector('#vision-root');
  if (!root) return;
  const merged = { ...DEFAULT_THEME, ...theme };
  root.style.setProperty('--vb-accent', merged.accent);
  root.style.setProperty('--vb-accent-2', merged.accent2);
  root.style.setProperty('--vb-bg', merged.bg);
  root.style.setProperty('--vb-surface', merged.surface);
  root.style.setProperty('--vb-surface-2', merged.surface2);
}

function setBoardStatus(message = '') {
  const statusEl = document.querySelector('#vb-board-status');
  if (statusEl) statusEl.textContent = message;
}

function getThemeByName(name) {
  return THEME_PRESETS.find(theme => theme.name === name) || DEFAULT_THEME;
}

function renderBoardSelect() {
  const select = document.querySelector('#vb-board-select');
  if (!select) return;
  select.innerHTML = '';
  if (!boardState.boards.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No boards yet';
    select.appendChild(option);
    select.disabled = true;
    return;
  }
  select.disabled = false;
  boardState.boards.forEach(board => {
    const option = document.createElement('option');
    option.value = board.id;
    option.textContent = `${board.title} · ${board.board_type === 'focus' ? 'Focus' : 'Vision'}`;
    select.appendChild(option);
  });
  select.value = boardState.activeBoardId || boardState.boards[0]?.id || '';
}

function updateBoardDetails() {
  const board = boardState.boards.find(item => item.id === boardState.activeBoardId);
  const detail = document.querySelector('#vb-board-detail');
  if (detail && board) {
    detail.querySelector('[data-field="title"]').textContent = board.title;
    detail.querySelector('[data-field="type"]').textContent = board.board_type === 'focus' ? 'Focus Board' : 'Vision Board';
    detail.querySelector('[data-field="theme"]').textContent = board.theme?.name || DEFAULT_THEME.name;
  }
  applyTheme(board?.theme);
}

function renderSections() {
  const list = document.querySelector('#vb-section-list');
  if (!list) return;
  list.innerHTML = '';
  if (!boardState.activeBoardId) {
    list.innerHTML = '<p class="vb-empty">Select a board to manage sections.</p>';
    return;
  }
  if (!boardState.sections.length) {
    list.innerHTML = '<p class="vb-empty">No sections yet. Add one to organize your board.</p>';
    return;
  }
  const fragment = document.createDocumentFragment();
  boardState.sections.forEach((section, index) => {
    const row = document.createElement('div');
    row.className = 'vb-section-row';
    row.dataset.id = section.id;
    row.innerHTML = `
      <div class="vb-section-title">${section.title}</div>
      <div class="vb-section-actions">
        <button class="vb-btn vb-btn--ghost" data-action="up" ${index === 0 ? 'disabled' : ''}>Up</button>
        <button class="vb-btn vb-btn--ghost" data-action="down" ${index === boardState.sections.length - 1 ? 'disabled' : ''}>Down</button>
        <button class="vb-btn vb-btn--ghost" data-action="rename">Rename</button>
      </div>
    `;
    fragment.appendChild(row);
  });
  list.appendChild(fragment);
}

async function loadSections() {
  if (!boardState.activeBoardId) {
    boardState.sections = [];
    renderSections();
    return;
  }
  const { data, error } = await supabase
    .from('vb_sections')
    .select('id,title,sort_index')
    .eq('board_id', boardState.activeBoardId)
    .order('sort_index', { ascending: true });
  if (error) {
    setBoardStatus('Unable to load sections. Run Vision Board V2 migrations to continue.');
    boardState.sections = [];
    renderSections();
    return;
  }
  boardState.sections = data || [];
  renderSections();
}

function getNextSectionIndex() {
  return boardState.sections.reduce((max, section) => Math.max(max, section.sort_index ?? 0), -1) + 1;
}

async function handleAddSection() {
  const input = document.querySelector('#vb-section-title');
  const title = input?.value?.trim();
  if (!boardState.activeBoardId) {
    setBoardStatus('Create a board before adding sections.');
    return;
  }
  if (!title) {
    setBoardStatus('Add a section name to continue.');
    return;
  }
  setBoardStatus('Adding section...');
  const { data, error } = await supabase
    .from('vb_sections')
    .insert([{
      board_id: boardState.activeBoardId,
      title,
      sort_index: getNextSectionIndex()
    }])
    .select('id,title,sort_index')
    .single();
  if (error) {
    setBoardStatus('Unable to add section. Check Supabase connection.');
    return;
  }
  boardState.sections = [...boardState.sections, data];
  if (input) input.value = '';
  setBoardStatus('');
  renderSections();
}

async function handleRenameSection(sectionId) {
  const section = boardState.sections.find(item => item.id === sectionId);
  if (!section) return;
  const nextTitle = window.prompt('Rename section', section.title);
  if (!nextTitle || nextTitle.trim() === section.title) return;
  setBoardStatus('Updating section...');
  const { error } = await supabase
    .from('vb_sections')
    .update({ title: nextTitle.trim() })
    .eq('id', sectionId);
  if (error) {
    setBoardStatus('Unable to rename section. Check Supabase connection.');
    return;
  }
  boardState.sections = boardState.sections.map(item => (
    item.id === sectionId ? { ...item, title: nextTitle.trim() } : item
  ));
  setBoardStatus('');
  renderSections();
}

async function handleMoveSection(sectionId, direction) {
  const index = boardState.sections.findIndex(item => item.id === sectionId);
  if (index < 0) return;
  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= boardState.sections.length) return;
  const current = boardState.sections[index];
  const target = boardState.sections[swapIndex];
  setBoardStatus('Reordering sections...');
  const updates = [
    { id: current.id, sort_index: target.sort_index },
    { id: target.id, sort_index: current.sort_index }
  ];
  const { error } = await supabase.from('vb_sections').upsert(updates);
  if (error) {
    setBoardStatus('Unable to reorder sections. Check Supabase connection.');
    return;
  }
  const nextSections = [...boardState.sections];
  nextSections[index] = { ...current, sort_index: target.sort_index };
  nextSections[swapIndex] = { ...target, sort_index: current.sort_index };
  boardState.sections = nextSections.sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0));
  setBoardStatus('');
  renderSections();
}

function renderCards() {
  const grid = document.querySelector('#vb-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!boardState.activeBoardId) {
    grid.innerHTML = '<p class="vb-empty">Select a board to view cards.</p>';
    return;
  }
  if (!boardState.cards.length) {
    grid.innerHTML = '<p class="vb-empty">No cards yet. Add your first image or affirmation.</p>';
    return;
  }
  const fragment = document.createDocumentFragment();
  boardState.cards.forEach(card => {
    const item = document.createElement('article');
    item.className = 'vb-card-item';
    item.dataset.size = card.size || 'M';
    item.dataset.id = card.id;
    const metaChips = [];
    metaChips.push(`<span class="vb-chip">Size ${card.size || 'M'}</span>`);
    if (card.favorite) {
      metaChips.push('<span class="vb-chip">★ Favorite</span>');
    }
    if (card.color) {
      metaChips.push(`<span class="vb-chip"><span class="dot" style="background:${card.color}"></span>${card.color}</span>`);
    }
    const tagChips = (card.tags || []).map(tag => `<span class="vb-chip">${tag}</span>`).join('');
    const meta = `
      <div class="vb-card-meta">
        ${metaChips.join('')}
      </div>
      ${tagChips ? `<div class="vb-card-tags">${tagChips}</div>` : ''}
    `;
    if (card.kind === 'text') {
      item.innerHTML = `
        <button class="vb-card-edit" data-action="edit">Edit</button>
        <div class="vb-card-text">${card.title || card.affirm || 'Untitled'}</div>
        ${meta}
      `;
    } else {
      const src = card.img_path || '';
      item.innerHTML = src
        ? `
          <button class="vb-card-edit" data-action="edit">Edit</button>
          <img class="vb-card-media" src="${src}" alt="${card.title || 'Vision card'}" />
          ${card.title ? `<div class="vb-card-caption">${card.title}</div>` : ''}
          ${meta}
        `
        : `
          <button class="vb-card-edit" data-action="edit">Edit</button>
          <div class="vb-card-text">${card.title || 'Image card'}</div>
          ${meta}
        `;
    }
    fragment.appendChild(item);
  });
  grid.appendChild(fragment);
}

async function loadCards() {
  if (!boardState.activeBoardId) {
    boardState.cards = [];
    renderCards();
    return;
  }
  const { data, error } = await supabase
    .from('vb_cards')
    .select('id,title,affirm,kind,img_path,size,sort_index,color,tags,favorite')
    .eq('board_id', boardState.activeBoardId)
    .order('sort_index', { ascending: true });
  if (error) {
    setBoardStatus('Unable to load cards. Run Vision Board V2 migrations to continue.');
    boardState.cards = [];
    renderCards();
    return;
  }
  boardState.cards = data || [];
  renderCards();
}

function toggleCardForm(show) {
  const form = document.querySelector('#vb-card-form');
  if (!form) return;
  form.toggleAttribute('data-open', show);
  form.hidden = !show;
  if (show) {
    form.querySelector('#vb-card-title')?.focus();
  }
}

function setCardFormMode(isEditing) {
  const saveButton = document.querySelector('#vb-save-card');
  if (saveButton) {
    saveButton.textContent = isEditing ? 'Save changes' : 'Add card';
  }
}

function resetCardForm() {
  const titleInput = document.querySelector('#vb-card-title');
  const typeSelect = document.querySelector('#vb-card-kind');
  const urlInput = document.querySelector('#vb-card-url');
  const affirmInput = document.querySelector('#vb-card-affirm');
  const sizeSelect = document.querySelector('#vb-card-size');
  const favoriteInput = document.querySelector('#vb-card-favorite');
  const colorInput = document.querySelector('#vb-card-color');
  const tagsInput = document.querySelector('#vb-card-tags');
  if (titleInput) titleInput.value = '';
  if (typeSelect) typeSelect.value = 'image';
  if (urlInput) urlInput.value = '';
  if (affirmInput) affirmInput.value = '';
  if (sizeSelect) sizeSelect.value = 'M';
  if (favoriteInput) favoriteInput.checked = false;
  if (colorInput) colorInput.value = '';
  if (tagsInput) tagsInput.value = '';
  boardState.editingCardId = null;
  setCardFormMode(false);
}

function syncCardFormFields() {
  const typeSelect = document.querySelector('#vb-card-kind');
  const urlRow = document.querySelector('#vb-card-url-row');
  const affirmRow = document.querySelector('#vb-card-affirm-row');
  if (!typeSelect || !urlRow || !affirmRow) return;
  const kind = typeSelect.value;
  const isText = kind === 'text';
  urlRow.hidden = isText;
  affirmRow.hidden = !isText;
}

function getNextCardIndex() {
  return boardState.cards.reduce((max, card) => Math.max(max, card.sort_index ?? 0), -1) + 1;
}

function parseTags(value) {
  if (!value) return [];
  return value.split(',').map(tag => tag.trim()).filter(Boolean);
}

function startEditingCard(cardId) {
  const card = boardState.cards.find(item => item.id === cardId);
  if (!card) return;
  boardState.editingCardId = card.id;
  const titleInput = document.querySelector('#vb-card-title');
  const typeSelect = document.querySelector('#vb-card-kind');
  const urlInput = document.querySelector('#vb-card-url');
  const affirmInput = document.querySelector('#vb-card-affirm');
  const sizeSelect = document.querySelector('#vb-card-size');
  const favoriteInput = document.querySelector('#vb-card-favorite');
  const colorInput = document.querySelector('#vb-card-color');
  const tagsInput = document.querySelector('#vb-card-tags');
  if (titleInput) titleInput.value = card.title || '';
  if (typeSelect) typeSelect.value = card.kind || 'image';
  if (urlInput) urlInput.value = card.img_path || '';
  if (affirmInput) affirmInput.value = card.affirm || '';
  if (sizeSelect) sizeSelect.value = card.size || 'M';
  if (favoriteInput) favoriteInput.checked = Boolean(card.favorite);
  if (colorInput) colorInput.value = card.color || '';
  if (tagsInput) tagsInput.value = (card.tags || []).join(', ');
  toggleCardForm(true);
  syncCardFormFields();
  setCardFormMode(true);
}

async function handleSaveCard() {
  const titleInput = document.querySelector('#vb-card-title');
  const typeSelect = document.querySelector('#vb-card-kind');
  const urlInput = document.querySelector('#vb-card-url');
  const affirmInput = document.querySelector('#vb-card-affirm');
  const sizeSelect = document.querySelector('#vb-card-size');
  const favoriteInput = document.querySelector('#vb-card-favorite');
  const colorInput = document.querySelector('#vb-card-color');
  const tagsInput = document.querySelector('#vb-card-tags');
  if (!boardState.activeBoardId) {
    setBoardStatus('Create a board before adding cards.');
    return;
  }
  const kind = typeSelect?.value || 'image';
  const title = titleInput?.value?.trim() || null;
  const affirm = affirmInput?.value?.trim() || null;
  const imgPath = urlInput?.value?.trim() || null;
  const size = sizeSelect?.value || 'M';
  const favorite = favoriteInput?.checked || false;
  const color = colorInput?.value?.trim() || null;
  const tags = parseTags(tagsInput?.value);
  if (kind === 'image' && !imgPath) {
    setBoardStatus('Paste an image URL to continue.');
    return;
  }
  if (kind === 'text' && !title && !affirm) {
    setBoardStatus('Add a title or affirmation to continue.');
    return;
  }
  const isEditing = Boolean(boardState.editingCardId);
  setBoardStatus(isEditing ? 'Saving card...' : 'Adding card...');
  const payload = {
    board_id: boardState.activeBoardId,
    user_id: boardState.userId,
    kind,
    title,
    affirm,
    img_path: kind === 'image' ? imgPath : null,
    size,
    favorite,
    color,
    tags
  };
  const query = isEditing
    ? supabase
      .from('vb_cards')
      .update(payload)
      .eq('id', boardState.editingCardId)
      .select('id,title,affirm,kind,img_path,size,sort_index,color,tags,favorite')
      .single()
    : supabase
      .from('vb_cards')
      .insert([{
        ...payload,
        sort_index: getNextCardIndex()
      }])
      .select('id,title,affirm,kind,img_path,size,sort_index,color,tags,favorite')
      .single();
  const { data, error } = await query;
  if (error) {
    setBoardStatus('Unable to save card. Check Supabase connection.');
    return;
  }
  if (isEditing) {
    boardState.cards = boardState.cards.map(card => card.id === data.id ? data : card);
  } else {
    boardState.cards = [...boardState.cards, data];
  }
  setBoardStatus('');
  resetCardForm();
  toggleCardForm(false);
  renderCards();
}

async function loadBoards() {
  setBoardStatus('Loading boards...');
  const { data, error } = await supabase
    .from('vb_boards')
    .select('id,title,board_type,theme,created_at')
    .order('created_at', { ascending: true });
  if (error) {
    setBoardStatus('Unable to load boards. Run Vision Board V2 migrations to continue.');
    return;
  }
  boardState.boards = data || [];
  boardState.activeBoardId = boardState.boards[0]?.id || null;
  renderBoardSelect();
  updateBoardDetails();
  await loadSections();
  await loadCards();
  setBoardStatus(boardState.boards.length ? '' : 'Create your first board to begin.');
}

function toggleBoardForm(show) {
  const form = document.querySelector('#vb-board-form');
  if (!form) return;
  form.toggleAttribute('data-open', show);
  form.hidden = !show;
  if (show) {
    form.querySelector('#vb-board-title')?.focus();
  }
}

function resetBoardForm() {
  const titleInput = document.querySelector('#vb-board-title');
  const typeSelect = document.querySelector('#vb-board-type');
  const themeSelect = document.querySelector('#vb-board-theme');
  if (titleInput) titleInput.value = '';
  if (typeSelect) typeSelect.value = 'vision';
  if (themeSelect) themeSelect.value = DEFAULT_THEME.name;
  const preview = document.querySelector('#vb-theme-preview');
  if (preview) {
    const theme = getThemeByName(DEFAULT_THEME.name);
    preview.style.background = `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`;
  }
}

async function handleCreateBoard() {
  const titleInput = document.querySelector('#vb-board-title');
  const typeSelect = document.querySelector('#vb-board-type');
  const themeSelect = document.querySelector('#vb-board-theme');
  const title = titleInput?.value?.trim();
  if (!title) {
    setBoardStatus('Add a board title to continue.');
    return;
  }
  const theme = getThemeByName(themeSelect?.value || DEFAULT_THEME.name);
  setBoardStatus('Creating board...');
  const { data, error } = await supabase
    .from('vb_boards')
    .insert([{
      user_id: boardState.userId,
      title,
      board_type: typeSelect?.value || 'vision',
      theme
    }])
    .select('id,title,board_type,theme,created_at')
    .single();
  if (error) {
    setBoardStatus('Unable to create board. Check Supabase connection.');
    return;
  }
  boardState.boards = [...boardState.boards, data];
  boardState.activeBoardId = data.id;
  renderBoardSelect();
  updateBoardDetails();
  toggleBoardForm(false);
  resetBoardForm();
  setBoardStatus('');
}

export async function mountVisionBoard() {
  const session = await requireAuth();
  const user = session?.user; if (!user) return;
  boardState.userId = user.id;

  // Find “Vision Board” panel
  let panel = document.querySelector('#tab-vision-board')
    || document.querySelector('[data-tab="Vision Board"]')
    || document.querySelector('[aria-label="Vision Board"]');

  if (!panel) {
    const els = Array.from(document.querySelectorAll('*'));
    const btn = els.find(el => (el.textContent?.trim?.().toLowerCase() === 'vision board'));
    if (btn) {
      const id = btn.getAttribute('aria-controls') || btn.getAttribute('data-panel') || btn.getAttribute('href')?.replace('#','');
      if (id) panel = document.getElementById(id);
    }
  }
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'tab-vision-board';
    (document.querySelector('#main-content') || document.body).appendChild(panel);
  }

  panel.innerHTML = `
    <article id="vision-root">
      <section id="vision-create"  data-title="Boards & Add Media"></section>
      <section id="vision-canvas"  data-title="Canvas"></section>
      <section id="vision-prompts" data-title="Prompts & Affirmations"></section>
      <section id="vision-story"   data-title="Story (Slideshow + Spotlight)"></section>
      <section id="vision-journal" data-title="Gratitude & Mood"></section>
      <aside   id="vision-build-status" data-title="Build Plan Status"></aside>
    </article>
  `;

  // TEMP placeholders; Codex will expand functionality
  document.querySelector('#vision-create').innerHTML = `
    <div class="vb-toolbar">
      <select class="vb-select" id="vb-board-select" aria-label="Boards"></select>
      <button class="vb-btn accent" id="vb-new-board">+ New Board</button>
      <button class="vb-btn primary" id="vb-add-card">+ Add Card</button>
    </div>
    <div class="vb-board-detail">
      <div>
        <div class="vb-board-label">Active board</div>
        <div class="vb-board-title" data-field="title">Vision Board</div>
      </div>
      <div class="vb-board-meta">
        <span data-field="type">Vision Board</span>
        <span class="vb-meta-sep">•</span>
        <span data-field="theme">${DEFAULT_THEME.name}</span>
      </div>
    </div>
    <div class="vb-board-form vb-card" id="vb-board-form" hidden>
      <div class="vb-form-row">
        <label class="vb-label" for="vb-board-title">Board name</label>
        <input class="vb-input" id="vb-board-title" placeholder="e.g., 2025 Vision" />
      </div>
      <div class="vb-form-row">
        <label class="vb-label" for="vb-board-type">Board type</label>
        <select class="vb-select" id="vb-board-type">
          <option value="vision">Vision</option>
          <option value="focus">Focus</option>
        </select>
      </div>
      <div class="vb-form-row">
        <label class="vb-label" for="vb-board-theme">Theme</label>
        <div class="vb-theme-row">
          <select class="vb-select" id="vb-board-theme"></select>
          <div class="vb-theme-preview" id="vb-theme-preview"></div>
        </div>
      </div>
      <div class="vb-form-actions">
        <button class="vb-btn" id="vb-cancel-board">Cancel</button>
        <button class="vb-btn primary" id="vb-save-board">Create board</button>
      </div>
    </div>
    <div class="vb-status" id="vb-board-status"></div>
    <div class="vb-card vb-card-form" id="vb-card-form" hidden>
      <div class="vb-form-row">
        <label class="vb-label" for="vb-card-kind">Card type</label>
        <select class="vb-select" id="vb-card-kind">
          <option value="image">Image (URL)</option>
          <option value="text">Text</option>
        </select>
      </div>
      <div class="vb-form-row">
        <label class="vb-label" for="vb-card-title">Title</label>
        <input class="vb-input" id="vb-card-title" placeholder="e.g., Launch my studio" />
      </div>
      <div class="vb-form-row" id="vb-card-url-row">
        <label class="vb-label" for="vb-card-url">Image URL</label>
        <input class="vb-input" id="vb-card-url" placeholder="https://..." />
      </div>
      <div class="vb-form-row" id="vb-card-affirm-row" hidden>
        <label class="vb-label" for="vb-card-affirm">Affirmation</label>
        <input class="vb-input" id="vb-card-affirm" placeholder="I show up with confidence." />
      </div>
      <div class="vb-form-row">
        <label class="vb-label" for="vb-card-size">Card size</label>
        <select class="vb-select" id="vb-card-size">
          <option value="S">Small</option>
          <option value="M" selected>Medium</option>
          <option value="L">Large</option>
          <option value="XL">Extra large</option>
        </select>
      </div>
      <div class="vb-form-row">
        <label class="vb-label" for="vb-card-color">Accent color</label>
        <input class="vb-input" id="vb-card-color" placeholder="#6ee7b7" />
      </div>
      <div class="vb-form-row">
        <label class="vb-label" for="vb-card-tags">Tags</label>
        <input class="vb-input" id="vb-card-tags" placeholder="growth, career" />
      </div>
      <div class="vb-form-row vb-form-row--inline">
        <label class="vb-checkbox">
          <input type="checkbox" id="vb-card-favorite" />
          Mark as favorite
        </label>
      </div>
      <div class="vb-form-actions">
        <button class="vb-btn" id="vb-cancel-card">Cancel</button>
        <button class="vb-btn primary" id="vb-save-card">Add card</button>
      </div>
    </div>
    <div class="vb-card vb-section-card">
      <div class="vb-section-header">
        <div>
          <div class="vb-board-label">Board sections</div>
          <div class="vb-section-subtitle">Group cards into themed areas.</div>
        </div>
        <div class="vb-section-form">
          <input class="vb-input" id="vb-section-title" placeholder="e.g., Career, Wellness" />
          <button class="vb-btn primary" id="vb-add-section">Add section</button>
        </div>
      </div>
      <div id="vb-section-list" class="vb-section-list"></div>
    </div>
  `;
  document.querySelector('#vision-canvas').innerHTML = `<div class="vb-grid" id="vb-grid"></div>`;
  document.querySelector('#vision-prompts').innerHTML = `
    <div class="prompt-chips" id="vb-prompt-chips"></div>
    <div class="mantra" id="vb-mantra">Daily mantra will show here</div>
  `;
  document.querySelector('#vision-story').innerHTML = `<button class="vb-btn" id="vb-play-slideshow">Play Slideshow</button>`;
  document.querySelector('#vision-journal').innerHTML = `
    <div class="mood-row">
      <div class="mood-dot mood-1" data-mood="1"></div>
      <div class="mood-dot mood-2" data-mood="2"></div>
      <div class="mood-dot mood-3" data-mood="3"></div>
      <div class="mood-dot mood-4" data-mood="4"></div>
      <div class="mood-dot mood-5" data-mood="5"></div>
    </div>
    <textarea id="vb-gratitude" placeholder="Today, I'm grateful for..."></textarea>
  `;
  mountBuildChecklist();
  const boardDetail = document.querySelector('.vb-board-detail');
  if (boardDetail) {
    boardDetail.id = 'vb-board-detail';
  }
  const themeSelect = document.querySelector('#vb-board-theme');
  if (themeSelect) {
    themeSelect.innerHTML = '';
    THEME_PRESETS.forEach(theme => {
      const option = document.createElement('option');
      option.value = theme.name;
      option.textContent = theme.name;
      themeSelect.appendChild(option);
    });
    themeSelect.value = DEFAULT_THEME.name;
  }
  const themePreview = document.querySelector('#vb-theme-preview');
  if (themePreview) {
    themePreview.style.background = `linear-gradient(135deg, ${DEFAULT_THEME.accent}, ${DEFAULT_THEME.accent2})`;
  }
  const newBoardButton = document.querySelector('#vb-new-board');
  const cancelBoardButton = document.querySelector('#vb-cancel-board');
  const saveBoardButton = document.querySelector('#vb-save-board');
  const boardSelect = document.querySelector('#vb-board-select');
  const sectionList = document.querySelector('#vb-section-list');
  const addSectionButton = document.querySelector('#vb-add-section');
  const addCardButton = document.querySelector('#vb-add-card');
  const cardForm = document.querySelector('#vb-card-form');
  const cancelCardButton = document.querySelector('#vb-cancel-card');
  const saveCardButton = document.querySelector('#vb-save-card');
  const cardKindSelect = document.querySelector('#vb-card-kind');
  const grid = document.querySelector('#vb-grid');

  newBoardButton?.addEventListener('click', () => {
    toggleBoardForm(true);
  });
  cancelBoardButton?.addEventListener('click', () => {
    toggleBoardForm(false);
    resetBoardForm();
    setBoardStatus('');
  });
  saveBoardButton?.addEventListener('click', () => {
    handleCreateBoard();
  });
  boardSelect?.addEventListener('change', event => {
    boardState.activeBoardId = event.target.value;
    updateBoardDetails();
    loadSections();
    loadCards();
  });
  themeSelect?.addEventListener('change', event => {
    const theme = getThemeByName(event.target.value);
    if (themePreview) {
      themePreview.style.background = `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`;
    }
  });
  addSectionButton?.addEventListener('click', () => {
    handleAddSection();
  });
  addCardButton?.addEventListener('click', () => {
    toggleCardForm(true);
    boardState.editingCardId = null;
    setCardFormMode(false);
    syncCardFormFields();
  });
  cancelCardButton?.addEventListener('click', () => {
    toggleCardForm(false);
    resetCardForm();
  });
  saveCardButton?.addEventListener('click', () => {
    handleSaveCard();
  });
  cardKindSelect?.addEventListener('change', () => {
    syncCardFormFields();
  });
  if (cardForm) {
    cardForm.id = 'vb-card-form';
  }
  grid?.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    if (action !== 'edit') return;
    const cardEl = button.closest('.vb-card-item');
    const cardId = cardEl?.dataset?.id;
    if (!cardId) return;
    startEditingCard(cardId);
  });
  sectionList?.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const row = button.closest('.vb-section-row');
    const sectionId = row?.dataset?.id;
    const action = button.dataset.action;
    if (!sectionId || !action) return;
    if (action === 'rename') {
      handleRenameSection(sectionId);
    } else if (action === 'up' || action === 'down') {
      handleMoveSection(sectionId, action);
    }
  });
  await loadBoards();
}

document.addEventListener('DOMContentLoaded', () => {
  // Ensure CSS is loaded
  if (!document.querySelector('link[href*="/app/vision/vision.css"]')) {
    const link = document.createElement('link'); link.rel='stylesheet'; link.href='/app/vision/vision.css'; document.head.appendChild(link);
  }
  mountVisionBoard();
});
