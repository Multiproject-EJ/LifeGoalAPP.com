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
  userId: null
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
  });
  themeSelect?.addEventListener('change', event => {
    const theme = getThemeByName(event.target.value);
    if (themePreview) {
      themePreview.style.background = `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`;
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
