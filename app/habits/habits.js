// ========================================================
// HABITS MODULE - MAIN LOGIC
// Comprehensive habits system for lifegoalapp.com
// ========================================================

import { supabase, getSession, requireAuth, getVapidPublicKey, getSupabaseUrl } from '../lib/supabaseClient.js';
import { BuildChecklist } from './BuildChecklist.js';
import { initNotifications, subscribeToPushNotifications, getNotificationStatus, testNotification } from './notifications.js';

// State management
const state = {
  currentStep: 1,
  wizardData: {},
  habits: [],
  logs: [],
  templates: [],
  challenges: [],
  selectedHabitForInsights: null,
  selectedChallenge: null,
};

// Initialize the habits module
export async function initHabits() {
  try {
    // Check auth
    const session = getSession();
    if (!session) {
      renderAuthRequired();
      return;
    }

    // Initialize notifications
    await initNotifications();

    // Listen for notification actions from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'HABIT_ACTION_FROM_NOTIFICATION') {
          handleNotificationAction(event.data.habitId, event.data.action);
        }
      });
    }

    // Load templates
    await loadTemplates();

    // Find and inject into "Set Up Habits" tab
    const tabContainer = findSetUpHabitsTab();
    if (!tabContainer) {
      console.error('Could not find "Set Up Habits" tab');
      return;
    }

    // Inject the habits UI structure
    injectHabitsStructure(tabContainer);

    // Load CSS
    loadCSS();

    // Initialize sections
    renderCreateHabitSection();
    await loadAndRenderActiveHabits();
    renderInsightsSection();
    renderChallengesSection();
    renderAutoProgressionUI();

    // Initialize build checklist
    const checklist = new BuildChecklist('habits-build-status');
    await checklist.init();

  } catch (error) {
    console.error('Failed to initialize habits module:', error);
    showError('Failed to initialize habits module: ' + error.message);
  }
}

// Find the "Set Up Habits" tab
function findSetUpHabitsTab() {
  // Try ID-based selectors
  let container = document.getElementById('tab-setup-habits');
  if (container) return container;

  container = document.querySelector('[data-tab="Set Up Habits"]');
  if (container) return container;

  container = document.querySelector('[aria-label="Set Up Habits"]');
  if (container) return container;

  // Try text content matching
  const allButtons = document.querySelectorAll('button');
  for (const button of allButtons) {
    if (button.textContent.trim().toLowerCase() === 'set up habits') {
      // Found the button, now find its panel
      const ariaControls = button.getAttribute('aria-controls');
      if (ariaControls) {
        container = document.getElementById(ariaControls);
        if (container) return container;
      }
      // Try finding the closest panel
      const panel = button.closest('.workspace-stage__body, .workspace-content, main');
      if (panel) return panel;
    }
  }

  // Fallback: create new section
  const main = document.querySelector('main, .workspace-main, .workspace-stage__body');
  if (main) {
    const section = document.createElement('section');
    section.id = 'tab-setup-habits';
    main.appendChild(section);
    return section;
  }

  return null;
}

// Inject the habits root structure
function injectHabitsStructure(container) {
  container.innerHTML = `
    <article id="habits-root">
      <section id="habits-setup"></section>
      <section id="habits-active"></section>
      <section id="habits-insights"></section>
      <section id="habits-challenges"></section>
      <aside id="habits-build-status"></aside>
    </article>
  `;
}

// Load CSS
function loadCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/app/habits/habits.css';
  document.head.appendChild(link);
}

// Load templates from JSON
async function loadTemplates() {
  try {
    const response = await fetch('/app/habits/templates.json');
    state.templates = await response.json();
  } catch (error) {
    console.error('Failed to load templates:', error);
    state.templates = [];
  }
}

// ========================================================
// CREATE HABIT SECTION (Wizard + Templates)
// ========================================================

function renderCreateHabitSection() {
  const container = document.getElementById('habits-setup');
  container.innerHTML = `
    <h2>Create Habit</h2>
    
    <div id="template-gallery" style="margin-bottom: 2rem;">
      <h3>Choose from Templates</h3>
      <div class="template-gallery">
        ${state.templates.map(template => `
          <div class="template-card" onclick="habits.useTemplate('${escapeHtml(template.title)}')">
            <div class="template-emoji">${template.emoji}</div>
            <div class="template-title">${escapeHtml(template.title)}</div>
            <div class="template-meta">${template.type} • ${getScheduleDescription(template.schedule)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div id="wizard-container">
      <h3>Or Create Custom Habit</h3>
      <div class="wizard-steps">
        <div class="wizard-step ${state.currentStep === 1 ? 'active' : ''} ${state.currentStep > 1 ? 'completed' : ''}">
          <strong>1. Basics</strong>
        </div>
        <div class="wizard-step ${state.currentStep === 2 ? 'active' : ''} ${state.currentStep > 2 ? 'completed' : ''}">
          <strong>2. Schedule</strong>
        </div>
        <div class="wizard-step ${state.currentStep === 3 ? 'active' : ''} ${state.currentStep > 3 ? 'completed' : ''}">
          <strong>3. Targets & Reminders</strong>
        </div>
      </div>
      
      <div id="wizard-content"></div>
    </div>
  `;

  renderWizardStep();
}

function renderWizardStep() {
  const content = document.getElementById('wizard-content');
  if (!content) return;

  if (state.currentStep === 1) {
    content.innerHTML = renderStep1();
  } else if (state.currentStep === 2) {
    content.innerHTML = renderStep2();
  } else if (state.currentStep === 3) {
    content.innerHTML = renderStep3();
  }
}

function renderStep1() {
  return `
    <div class="habit-card">
      <h4>Step 1: Basics</h4>
      
      <div class="form-group">
        <label>Habit Title *</label>
        <input type="text" id="habit-title" placeholder="e.g., Morning meditation" 
               value="${state.wizardData.title || ''}" />
      </div>

      <div class="form-group">
        <label>Emoji (optional)</label>
        <input type="text" id="habit-emoji" placeholder="🧘" maxlength="2"
               value="${state.wizardData.emoji || ''}" />
      </div>

      <div class="form-group">
        <label>Habit Type *</label>
        <select id="habit-type">
          <option value="boolean" ${state.wizardData.type === 'boolean' ? 'selected' : ''}>
            Boolean (Done/Not Done)
          </option>
          <option value="quantity" ${state.wizardData.type === 'quantity' ? 'selected' : ''}>
            Quantity (Track a number)
          </option>
          <option value="duration" ${state.wizardData.type === 'duration' ? 'selected' : ''}>
            Duration (Track time)
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>Why this habit? (optional)</label>
        <textarea id="habit-reason" rows="3" placeholder="Your motivation for building this habit...">${state.wizardData.reason || ''}</textarea>
      </div>

      <button class="btn-primary" onclick="habits.nextStep()">Next →</button>
    </div>
  `;
}

function renderStep2() {
  return `
    <div class="habit-card">
      <h4>Step 2: Schedule</h4>
      
      <div class="form-group">
        <label>Schedule Mode *</label>
        <select id="schedule-mode" onchange="habits.updateScheduleUI()">
          <option value="daily" ${state.wizardData.scheduleMode === 'daily' ? 'selected' : ''}>
            Daily
          </option>
          <option value="specific_days" ${state.wizardData.scheduleMode === 'specific_days' ? 'selected' : ''}>
            Specific Days
          </option>
          <option value="times_per_week" ${state.wizardData.scheduleMode === 'times_per_week' ? 'selected' : ''}>
            Times Per Week
          </option>
          <option value="every_n_days" ${state.wizardData.scheduleMode === 'every_n_days' ? 'selected' : ''}>
            Every N Days
          </option>
        </select>
      </div>

      <div id="schedule-config"></div>

      <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
        <button class="btn-secondary" onclick="habits.prevStep()">← Back</button>
        <button class="btn-primary" onclick="habits.nextStep()">Next →</button>
      </div>
    </div>
  `;
}

function renderStep3() {
  const showTargets = state.wizardData.type !== 'boolean';
  const notifStatus = getNotificationStatus();
  
  return `
    <div class="habit-card">
      <h4>Step 3: Targets & Reminders</h4>
      
      ${showTargets ? `
        <div class="form-group">
          <label>Target ${state.wizardData.type === 'quantity' ? 'Quantity' : 'Duration'} *</label>
          <input type="number" id="target-num" placeholder="${state.wizardData.type === 'quantity' ? '8' : '20'}" 
                 value="${state.wizardData.targetNum || ''}" min="1" />
        </div>

        <div class="form-group">
          <label>Unit *</label>
          <input type="text" id="target-unit" placeholder="${state.wizardData.type === 'quantity' ? 'glasses, steps, pages' : 'minutes'}" 
                 value="${state.wizardData.targetUnit || ''}" />
        </div>
      ` : ''}

      <div class="form-group">
        <label>
          <input type="checkbox" id="allow-skip" ${state.wizardData.allowSkip !== false ? 'checked' : ''} />
          Allow skipping days
        </label>
      </div>

      <div class="form-group">
        <label>Push Notifications</label>
        <div style="padding: 0.75rem; background: ${notifStatus.subscribed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border-radius: 0.5rem; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="font-size: 1.25rem;">${notifStatus.subscribed ? '✅' : '🔔'}</span>
            <strong>Status: ${notifStatus.subscribed ? 'Enabled' : 'Not Enabled'}</strong>
          </div>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #6b7280;">
            ${notifStatus.subscribed 
              ? 'You will receive push notifications for habit reminders.' 
              : 'Enable push notifications to get reminders on your phone.'}
          </p>
          ${!notifStatus.subscribed ? `
            <button type="button" class="btn-secondary" onclick="habits.enableNotifications()" style="margin-top: 0.75rem;">
              Enable Push Notifications
            </button>
          ` : `
            <button type="button" class="btn-secondary" onclick="habits.testNotification()" style="margin-top: 0.75rem;">
              Test Notification
            </button>
          `}
        </div>
      </div>

      <div class="form-group">
        <label>Reminder Times (up to 3)</label>
        <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">
          Set times when you want to be reminded about this habit. 
          ${notifStatus.subscribed ? 'You will receive push notifications.' : 'Enable push notifications above to get alerts on your phone.'}
        </p>
        <div id="reminders-list">
          <input type="time" class="reminder-time" value="${state.wizardData.reminders?.[0] || ''}" />
          <input type="time" class="reminder-time" value="${state.wizardData.reminders?.[1] || ''}" />
          <input type="time" class="reminder-time" value="${state.wizardData.reminders?.[2] || ''}" />
        </div>
      </div>

      <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
        <button class="btn-secondary" onclick="habits.prevStep()">← Back</button>
        <button class="btn-primary" onclick="habits.saveHabit()">Save Habit</button>
      </div>
    </div>
  `;
}

function updateScheduleUI() {
  const mode = document.getElementById('schedule-mode')?.value;
  const container = document.getElementById('schedule-config');
  if (!container) return;

  state.wizardData.scheduleMode = mode;

  if (mode === 'specific_days') {
    container.innerHTML = `
      <div class="form-group">
        <label>Select Days</label>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
          ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => `
            <label style="flex: 0 0 calc(25% - 0.5rem); display: flex; align-items: center; gap: 0.25rem;">
              <input type="checkbox" class="schedule-day" value="${idx}" 
                     ${(state.wizardData.scheduleDays || []).includes(idx) ? 'checked' : ''} />
              ${day}
            </label>
          `).join('')}
        </div>
      </div>
    `;
  } else if (mode === 'times_per_week') {
    container.innerHTML = `
      <div class="form-group">
        <label>Times Per Week</label>
        <input type="number" id="times-per-week" min="1" max="7" 
               value="${state.wizardData.timesPerWeek || 3}" />
      </div>
    `;
  } else if (mode === 'every_n_days') {
    container.innerHTML = `
      <div class="form-group">
        <label>Every N Days</label>
        <input type="number" id="every-n-days" min="1" 
               value="${state.wizardData.everyNDays || 2}" />
      </div>
    `;
  } else {
    container.innerHTML = '<p style="color: #6b7280; font-size: 0.875rem;">Habit will be scheduled every day.</p>';
  }
}

function useTemplate(templateTitle) {
  const template = state.templates.find(t => t.title === templateTitle);
  if (!template) return;

  // Pre-fill wizard data
  state.wizardData = {
    title: template.title,
    emoji: template.emoji,
    type: template.type,
    targetNum: template.target_num,
    targetUnit: template.target_unit,
    scheduleMode: template.schedule.mode,
    scheduleDays: template.schedule.days,
    timesPerWeek: template.schedule.value,
    everyNDays: template.schedule.value,
    allowSkip: template.allow_skip,
    reminders: template.reminders,
  };

  state.currentStep = 1;
  renderWizardStep();
}

function nextStep() {
  // Validate current step
  if (state.currentStep === 1) {
    const title = document.getElementById('habit-title')?.value.trim();
    const type = document.getElementById('habit-type')?.value;
    
    if (!title) {
      alert('Please enter a habit title');
      return;
    }

    state.wizardData.title = title;
    state.wizardData.emoji = document.getElementById('habit-emoji')?.value.trim() || '';
    state.wizardData.type = type;
    state.wizardData.reason = document.getElementById('habit-reason')?.value.trim() || '';
  } else if (state.currentStep === 2) {
    const mode = document.getElementById('schedule-mode')?.value;
    state.wizardData.scheduleMode = mode;

    if (mode === 'specific_days') {
      const checkboxes = document.querySelectorAll('.schedule-day:checked');
      state.wizardData.scheduleDays = Array.from(checkboxes).map(cb => parseInt(cb.value));
      
      if (state.wizardData.scheduleDays.length === 0) {
        alert('Please select at least one day');
        return;
      }
    } else if (mode === 'times_per_week') {
      const value = parseInt(document.getElementById('times-per-week')?.value);
      if (!value || value < 1 || value > 7) {
        alert('Please enter a valid number (1-7)');
        return;
      }
      state.wizardData.timesPerWeek = value;
    } else if (mode === 'every_n_days') {
      const value = parseInt(document.getElementById('every-n-days')?.value);
      if (!value || value < 1) {
        alert('Please enter a valid number (minimum 1)');
        return;
      }
      state.wizardData.everyNDays = value;
    }
  }

  state.currentStep++;
  renderCreateHabitSection();
}

function prevStep() {
  state.currentStep--;
  renderCreateHabitSection();
}

async function saveHabit() {
  try {
    const session = requireAuth();

    // Collect step 3 data
    if (state.wizardData.type !== 'boolean') {
      const targetNum = parseFloat(document.getElementById('target-num')?.value);
      const targetUnit = document.getElementById('target-unit')?.value.trim();
      
      if (!targetNum || !targetUnit) {
        alert('Please enter target number and unit');
        return;
      }

      state.wizardData.targetNum = targetNum;
      state.wizardData.targetUnit = targetUnit;
    }

    state.wizardData.allowSkip = document.getElementById('allow-skip')?.checked !== false;

    const reminderInputs = document.querySelectorAll('.reminder-time');
    state.wizardData.reminders = Array.from(reminderInputs)
      .map(input => input.value)
      .filter(val => val);

    // Build schedule JSON
    const schedule = buildScheduleJSON();

    // Insert habit
    const { data: habit, error: habitError } = await supabase
      .from('habits_v2')
      .insert({
        user_id: session.user.id,
        title: state.wizardData.title,
        emoji: state.wizardData.emoji || null,
        type: state.wizardData.type,
        target_num: state.wizardData.targetNum || null,
        target_unit: state.wizardData.targetUnit || null,
        schedule,
        allow_skip: state.wizardData.allowSkip,
      })
      .select()
      .single();

    if (habitError) throw habitError;

    // Insert reminders
    if (state.wizardData.reminders && state.wizardData.reminders.length > 0) {
      const reminders = state.wizardData.reminders.map(time => ({
        habit_id: habit.id,
        local_time: time,
      }));

      const { error: reminderError } = await supabase
        .from('habit_reminders')
        .insert(reminders);

      if (reminderError) console.error('Failed to save reminders:', reminderError);
    }

    // Reset wizard
    state.wizardData = {};
    state.currentStep = 1;

    // Refresh UI
    renderCreateHabitSection();
    await loadAndRenderActiveHabits();

    alert('Habit created successfully! 🎉');
  } catch (error) {
    console.error('Failed to save habit:', error);
    alert('Failed to save habit: ' + error.message);
  }
}

function buildScheduleJSON() {
  const mode = state.wizardData.scheduleMode;

  if (mode === 'daily') {
    return { mode: 'daily' };
  } else if (mode === 'specific_days') {
    return { mode: 'specific_days', days: state.wizardData.scheduleDays };
  } else if (mode === 'times_per_week') {
    return { mode: 'times_per_week', value: state.wizardData.timesPerWeek };
  } else if (mode === 'every_n_days') {
    return { mode: 'every_n_days', value: state.wizardData.everyNDays };
  }

  return { mode: 'daily' };
}

// ========================================================
// ACTIVE HABITS SECTION
// ========================================================

async function loadAndRenderActiveHabits() {
  const container = document.getElementById('habits-active');
  container.innerHTML = '<h2>Active Habits</h2><p>Loading...</p>';

  try {
    const session = requireAuth();

    // Load habits
    const { data: habits, error: habitsError } = await supabase
      .from('habits_v2')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('archived', false)
      .order('created_at', { ascending: false });

    if (habitsError) throw habitsError;

    state.habits = habits || [];

    // Load logs for today
    const today = new Date().toISOString().split('T')[0];
    const { data: logs, error: logsError } = await supabase
      .from('habit_logs_v2')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('date', today);

    if (logsError) throw logsError;

    state.logs = logs || [];

    // Load streaks
    const { data: streaks, error: streaksError } = await supabase
      .from('v_habit_streaks')
      .select('*')
      .in('habit_id', habits.map(h => h.id));

    if (streaksError) console.error('Failed to load streaks:', streaksError);

    renderActiveHabits(habits, logs, streaks || []);
  } catch (error) {
    console.error('Failed to load active habits:', error);
    container.innerHTML = `
      <h2>Active Habits</h2>
      <div class="empty-state">
        <h3>Error loading habits</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

function renderActiveHabits(habits, logs, streaks) {
  const container = document.getElementById('habits-active');

  if (habits.length === 0) {
    container.innerHTML = `
      <h2>Active Habits</h2>
      <div class="empty-state">
        <h3>No active habits yet</h3>
        <p>Create your first habit above to get started!</p>
      </div>
    `;
    return;
  }

  const html = `
    <h2>Active Habits</h2>
    <div style="display: grid; gap: 1rem;">
      ${habits.map(habit => renderActiveHabitCard(habit, logs, streaks)).join('')}
    </div>
  `;

  container.innerHTML = html;
}

function renderActiveHabitCard(habit, logs, streaks) {
  const todayLog = logs.find(l => l.habit_id === habit.id && l.done);
  const isDone = !!todayLog;
  const streak = streaks.find(s => s.habit_id === habit.id);
  
  let actionButton = '';
  
  if (habit.type === 'boolean') {
    actionButton = `
      <button class="btn-${isDone ? 'secondary' : 'primary'}" 
              onclick="habits.toggleBoolean('${habit.id}', ${isDone})">
        ${isDone ? '✓ Done' : 'Mark Done'}
      </button>
    `;
  } else if (habit.type === 'quantity') {
    const currentValue = logs
      .filter(l => l.habit_id === habit.id)
      .reduce((sum, l) => sum + (l.value || 0), 0);
    
    actionButton = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <button class="btn-secondary" onclick="habits.adjustQuantity('${habit.id}', -${habit.target_num || 1})">−</button>
        <span style="min-width: 80px; text-align: center;">
          <strong>${currentValue}</strong> / ${habit.target_num} ${habit.target_unit}
        </span>
        <button class="btn-primary" onclick="habits.adjustQuantity('${habit.id}', ${habit.target_num || 1})">+</button>
      </div>
    `;
  } else if (habit.type === 'duration') {
    actionButton = `
      <button class="btn-primary" onclick="habits.startTimer('${habit.id}')">
        Start Timer
      </button>
    `;
  }

  const skipButton = habit.allow_skip ? `
    <button class="btn-secondary" onclick="habits.skipHabit('${habit.id}')">
      Skip Today
    </button>
  ` : '';

  return `
    <div class="habit-card">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
        <div>
          <h3 style="margin: 0 0 0.5rem 0;">
            ${habit.emoji || ''} ${escapeHtml(habit.title)}
          </h3>
          <p style="margin: 0; font-size: 0.875rem; color: #6b7280;">
            ${getScheduleDescription(habit.schedule)}
          </p>
        </div>
        <div style="text-align: right; font-size: 0.875rem;">
          <div>🔥 ${streak?.current_streak || 0} day streak</div>
          <div style="color: #6b7280;">Best: ${streak?.best_streak || 0}</div>
        </div>
      </div>
      
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        ${actionButton}
        ${skipButton}
      </div>
    </div>
  `;
}

async function toggleBoolean(habitId, currentDone) {
  try {
    const session = requireAuth();
    const today = new Date().toISOString().split('T')[0];

    if (currentDone) {
      // Delete the log
      const { error } = await supabase
        .from('habit_logs_v2')
        .delete()
        .eq('habit_id', habitId)
        .eq('user_id', session.user.id)
        .eq('date', today);

      if (error) throw error;
    } else {
      // Insert log
      const { error } = await supabase
        .from('habit_logs_v2')
        .insert({
          habit_id: habitId,
          user_id: session.user.id,
          done: true,
        });

      if (error) throw error;
    }

    await loadAndRenderActiveHabits();
  } catch (error) {
    console.error('Failed to toggle habit:', error);
    alert('Failed to update habit: ' + error.message);
  }
}

async function adjustQuantity(habitId, delta) {
  try {
    const session = requireAuth();

    const { error } = await supabase
      .from('habit_logs_v2')
      .insert({
        habit_id: habitId,
        user_id: session.user.id,
        done: true,
        value: delta,
      });

    if (error) throw error;

    await loadAndRenderActiveHabits();
  } catch (error) {
    console.error('Failed to adjust quantity:', error);
    alert('Failed to update quantity: ' + error.message);
  }
}

async function skipHabit(habitId) {
  try {
    const session = requireAuth();

    const { error } = await supabase
      .from('habit_logs_v2')
      .insert({
        habit_id: habitId,
        user_id: session.user.id,
        done: false,
        note: 'skipped',
      });

    if (error) throw error;

    await loadAndRenderActiveHabits();
  } catch (error) {
    console.error('Failed to skip habit:', error);
    alert('Failed to skip habit: ' + error.message);
  }
}

function startTimer(habitId) {
  alert('Timer feature coming soon! For now, you can manually log duration.');
}

// ========================================================
// INSIGHTS SECTION (Heatmap + Stats)
// ========================================================

function renderInsightsSection() {
  const container = document.getElementById('habits-insights');
  
  const habitOptions = state.habits.length > 0 
    ? state.habits.map(h => `<option value="${h.id}">${escapeHtml(h.title)}</option>`).join('')
    : '<option value="">No habits yet</option>';

  container.innerHTML = `
    <h2>Insights</h2>
    
    <div class="form-group">
      <label>Select Habit</label>
      <select id="insights-habit-select" onchange="habits.renderHabitInsights()">
        <option value="">Choose a habit...</option>
        ${habitOptions}
      </select>
    </div>

    <div id="insights-content">
      <p style="color: #6b7280;">Select a habit to view insights.</p>
    </div>
  `;
}

async function renderHabitInsights() {
  const select = document.getElementById('insights-habit-select');
  const habitId = select?.value;
  const content = document.getElementById('insights-content');

  if (!habitId || !content) {
    if (content) content.innerHTML = '<p style="color: #6b7280;">Select a habit to view insights.</p>';
    return;
  }

  content.innerHTML = '<p>Loading insights...</p>';

  try {
    const session = requireAuth();
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Load logs for last 31 days
    const { data: logs, error } = await supabase
      .from('habit_logs_v2')
      .select('*')
      .eq('habit_id', habitId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .lte('date', today.toISOString().split('T')[0]);

    if (error) throw error;

    // Calculate stats
    const doneLogs = (logs || []).filter(l => l.done);
    const successRate7 = calculateSuccessRate(doneLogs, 7);
    const successRate30 = calculateSuccessRate(doneLogs, 30);

    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${doneLogs.length}</div>
          <div class="stat-label">Completions (30d)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${successRate7}%</div>
          <div class="stat-label">Success Rate (7d)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${successRate30}%</div>
          <div class="stat-label">Success Rate (30d)</div>
        </div>
      </div>

      <div class="heatmap-container">
        <h4>31-Day Heatmap</h4>
        <canvas id="heatmap-canvas" width="700" height="100"></canvas>
      </div>
    `;

    renderHeatmap(logs || []);
  } catch (error) {
    console.error('Failed to load insights:', error);
    content.innerHTML = `<p style="color: #ef4444;">Failed to load insights: ${error.message}</p>`;
  }
}

function calculateSuccessRate(doneLogs, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  
  const recentLogs = doneLogs.filter(l => l.date >= cutoffStr);
  return Math.round((recentLogs.length / days) * 100);
}

function renderHeatmap(logs) {
  const canvas = document.getElementById('heatmap-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cellSize = 20;
  const gap = 2;
  const days = 31;

  // Create a map of dates to completion status
  const completionMap = {};
  logs.forEach(log => {
    if (log.done) {
      completionMap[log.date] = true;
    }
  });

  // Draw cells for last 31 days
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (days - 1 - i));
    const dateStr = date.toISOString().split('T')[0];
    
    const x = i * (cellSize + gap);
    const y = 10;

    const isComplete = completionMap[dateStr];
    ctx.fillStyle = isComplete ? '#10b981' : '#e5e7eb';
    ctx.fillRect(x, y, cellSize, cellSize);
  }

  // Add labels
  ctx.fillStyle = '#6b7280';
  ctx.font = '10px sans-serif';
  ctx.fillText('31 days ago', 0, 8);
  ctx.fillText('Today', days * (cellSize + gap) - 30, 8);
}

// ========================================================
// CHALLENGES SECTION
// ========================================================

function renderChallengesSection() {
  const container = document.getElementById('habits-challenges');
  container.innerHTML = `
    <h2>Challenges</h2>
    <p>Feature coming soon! Create challenges and compete with friends.</p>
  `;
}

// ========================================================
// AUTO-PROGRESSION UI
// ========================================================

function renderAutoProgressionUI() {
  // Auto-progression is configured per-habit in an "Advanced" section
  // For now, placeholder
}

// ========================================================
// UTILITY FUNCTIONS
// ========================================================

function renderAuthRequired() {
  const root = document.getElementById('habits-root');
  if (root) {
    root.innerHTML = `
      <div class="empty-state">
        <h3>Authentication Required</h3>
        <p>Please sign in to access the habits module.</p>
      </div>
    `;
  }
}

function showError(message) {
  alert(message);
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function getScheduleDescription(schedule) {
  if (!schedule || !schedule.mode) return 'Daily';
  
  if (schedule.mode === 'daily') return 'Daily';
  if (schedule.mode === 'specific_days') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (schedule.days || []).map(d => days[d]).join(', ');
  }
  if (schedule.mode === 'times_per_week') return `${schedule.value}x per week`;
  if (schedule.mode === 'every_n_days') return `Every ${schedule.value} days`;
  
  return 'Custom';
}

// ========================================================
// NOTIFICATION FUNCTIONS
// ========================================================

async function handleNotificationAction(habitId, action) {
  console.log('Notification action:', action, 'for habit:', habitId);
  
  if (action === 'done') {
    // Mark habit as done (second param 'false' means it's not currently done, so we're marking it as done)
    await toggleBoolean(habitId, /* currentDone */ false);
  } else if (action === 'skip') {
    // Skip habit
    await skipHabit(habitId);
  }
  
  // Refresh the UI
  await loadAndRenderActiveHabits();
}

async function enableNotifications() {
  try {
    await subscribeToPushNotifications();
    alert('Push notifications enabled! You will receive reminders for your habits. 🔔');
    // Re-render step 3 to update status
    if (state.currentStep === 3) {
      renderWizardStep();
    }
  } catch (error) {
    console.error('Failed to enable notifications:', error);
    alert('Failed to enable notifications: ' + error.message + '\n\nPlease check your browser settings and ensure notifications are not blocked.');
  }
}

async function showTestNotification() {
  try {
    const success = await testNotification();
    if (success) {
      alert('Test notification sent! Check your notifications. 🔔');
    } else {
      alert('Failed to send test notification. Please ensure notifications are enabled in your browser settings.');
    }
  } catch (error) {
    console.error('Failed to send test notification:', error);
    alert('Failed to send test notification: ' + error.message);
  }
}

// Export functions to window for onclick handlers
if (typeof window !== 'undefined') {
  window.habits = {
    useTemplate,
    nextStep,
    prevStep,
    saveHabit,
    updateScheduleUI,
    toggleBoolean,
    adjustQuantity,
    skipHabit,
    startTimer,
    renderHabitInsights,
    enableNotifications,
    testNotification: showTestNotification,
  };
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHabits);
  } else {
    initHabits();
  }
}
