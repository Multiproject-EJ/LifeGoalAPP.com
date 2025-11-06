// ========================================================
// BUILD CHECKLIST COMPONENT
// Renders the on-page build checklist from buildplan.json
// ========================================================

export class BuildChecklist {
  constructor(containerId) {
    this.containerId = containerId;
    this.buildPlan = null;
  }

  async init() {
    try {
      const response = await fetch('/app/habits/buildplan.json');
      this.buildPlan = await response.json();
      this.render();
    } catch (error) {
      console.error('Failed to load build plan:', error);
      this.renderError();
    }
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container ${this.containerId} not found`);
      return;
    }

    if (!this.buildPlan) {
      container.innerHTML = '<p>Build checklist not available.</p>';
      return;
    }

    const html = `
      <h3>Build Progress Checklist</h3>
      <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1.5rem;">
        Track implementation progress for the comprehensive habits system
      </p>
      ${this.buildPlan.phases.map(phase => this.renderPhase(phase)).join('')}
    `;

    container.innerHTML = html;
  }

  renderPhase(phase) {
    const totalItems = phase.items.length;
    const doneItems = phase.items.filter(item => item.status === 'done').length;
    const percentage = Math.round((doneItems / totalItems) * 100);

    return `
      <div class="checklist-phase">
        <div class="checklist-phase-title">
          ${phase.title}
          <span style="float: right; font-size: 0.875rem; color: #6b7280;">
            ${doneItems}/${totalItems} (${percentage}%)
          </span>
        </div>
        ${phase.items.map(item => this.renderItem(item)).join('')}
      </div>
    `;
  }

  renderItem(item) {
    const isDone = item.status === 'done';
    const isTodo = item.status === 'todo';
    const icon = isDone ? '✅' : isTodo ? '⬜' : '🔄';

    return `
      <div class="checklist-item ${isDone ? 'done' : ''}">
        <span style="margin-right: 0.5rem;">${icon}</span>
        <label>
          ${item.label}
        </label>
      </div>
    `;
  }

  renderError() {
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Unable to load build checklist</h3>
          <p>The build plan file could not be loaded.</p>
        </div>
      `;
    }
  }
}
