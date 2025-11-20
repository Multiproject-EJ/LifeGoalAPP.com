import { ChangeEvent, FormEvent, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { LifeWheelCategoryKey } from '../features/checkins/LifeWheelCheckins';
import type { GoalStatusTag } from '../features/goals/goalStatus';
import { DEFAULT_GOAL_STATUS, GOAL_STATUS_OPTIONS } from '../features/goals/goalStatus';
import useAiGoalSuggestion from '../hooks/useAiGoalSuggestion';

type LifeGoalStep = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  substeps: LifeGoalSubstep[];
};

type LifeGoalSubstep = {
  id: string;
  title: string;
};

type LifeGoalAlert = {
  id: string;
  alertType: 'milestone' | 'deadline' | 'reminder' | 'custom';
  alertTime: string;
  title: string;
  message: string;
  repeatPattern: 'once' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
};

type LifeGoalFormData = {
  title: string;
  description: string;
  lifeWheelCategory: LifeWheelCategoryKey;
  startDate: string;
  targetDate: string;
  estimatedDurationDays: string;
  timingNotes: string;
  statusTag: GoalStatusTag;
  steps: LifeGoalStep[];
  alerts: LifeGoalAlert[];
};

type LifeGoalInputDialogProps = {
  session: Session;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LifeGoalFormData) => Promise<void>;
  initialCategory: LifeWheelCategoryKey | null;
};

export function LifeGoalInputDialog({
  session,
  isOpen,
  onClose,
  onSave,
  initialCategory,
}: LifeGoalInputDialogProps) {
  // Initialize AI goal suggestion hook for generating goal recommendations
  const { loading: aiLoading, error: aiError, suggestion: aiSuggestion, generateSuggestion } = useAiGoalSuggestion();

  const [formData, setFormData] = useState<LifeGoalFormData>(() => ({
    title: '',
    description: '',
    lifeWheelCategory: initialCategory || 'health_fitness',
    startDate: '',
    targetDate: '',
    estimatedDurationDays: '',
    timingNotes: '',
    statusTag: DEFAULT_GOAL_STATUS,
    steps: [],
    alerts: [],
  }));

  const [currentStep, setCurrentStep] = useState<Partial<LifeGoalStep>>({
    title: '',
    description: '',
    dueDate: '',
    substeps: [],
  });

  const [currentSubstep, setCurrentSubstep] = useState('');
  const [currentAlert, setCurrentAlert] = useState<Partial<LifeGoalAlert>>({
    alertType: 'reminder',
    alertTime: '',
    title: '',
    message: '',
    repeatPattern: 'once',
    enabled: true,
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'steps' | 'timing' | 'alerts'>('basic');

  const handleFieldChange = (field: keyof LifeGoalFormData) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleAddStep = () => {
    if (!currentStep.title?.trim()) return;

    const newStep: LifeGoalStep = {
      id: crypto.randomUUID(),
      title: currentStep.title,
      description: currentStep.description || '',
      dueDate: currentStep.dueDate || '',
      substeps: currentStep.substeps || [],
    };

    setFormData((current) => ({
      ...current,
      steps: [...current.steps, newStep],
    }));

    setCurrentStep({
      title: '',
      description: '',
      dueDate: '',
      substeps: [],
    });
  };

  const handleRemoveStep = (stepId: string) => {
    setFormData((current) => ({
      ...current,
      steps: current.steps.filter((step) => step.id !== stepId),
    }));
  };

  const handleAddSubstep = () => {
    if (!currentSubstep.trim()) return;

    const newSubstep: LifeGoalSubstep = {
      id: crypto.randomUUID(),
      title: currentSubstep,
    };

    setCurrentStep((current) => ({
      ...current,
      substeps: [...(current.substeps || []), newSubstep],
    }));

    setCurrentSubstep('');
  };

  const handleRemoveSubstep = (substepId: string) => {
    setCurrentStep((current) => ({
      ...current,
      substeps: (current.substeps || []).filter((substep) => substep.id !== substepId),
    }));
  };

  const handleAddAlert = () => {
    if (!currentAlert.title?.trim() || !currentAlert.alertTime) return;

    const newAlert: LifeGoalAlert = {
      id: crypto.randomUUID(),
      alertType: currentAlert.alertType || 'reminder',
      alertTime: currentAlert.alertTime || '',
      title: currentAlert.title,
      message: currentAlert.message || '',
      repeatPattern: currentAlert.repeatPattern || 'once',
      enabled: currentAlert.enabled !== false,
    };

    setFormData((current) => ({
      ...current,
      alerts: [...current.alerts, newAlert],
    }));

    setCurrentAlert({
      alertType: 'reminder',
      alertTime: '',
      title: '',
      message: '',
      repeatPattern: 'once',
      enabled: true,
    });
  };

  const handleRemoveAlert = (alertId: string) => {
    setFormData((current) => ({
      ...current,
      alerts: current.alerts.filter((alert) => alert.id !== alertId),
    }));
  };

  const handleGenerateAiSuggestion = async () => {
    if (!formData.description.trim()) return;

    // Calculate timeframe from target date if available
    let timeframe: string | undefined;
    if (formData.targetDate) {
      const targetDate = new Date(formData.targetDate);
      const today = new Date();
      const daysUntil = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 0) {
        timeframe = `${daysUntil} days`;
      }
    } else if (formData.estimatedDurationDays) {
      timeframe = `${formData.estimatedDurationDays} days`;
    }

    await generateSuggestion({
      description: formData.description,
      timeframe,
      category: formData.lifeWheelCategory,
    });
  };

  const handleUseAiSuggestion = () => {
    if (!aiSuggestion) return;

    // Update the title with AI-generated goal
    setFormData((current) => ({
      ...current,
      title: aiSuggestion.goal,
    }));

    // Convert milestones to steps
    const newSteps: LifeGoalStep[] = aiSuggestion.milestones.map((milestone, index) => ({
      id: crypto.randomUUID(),
      title: milestone,
      description: '',
      dueDate: '',
      substeps: [],
    }));

    // If there are tasks, add them as substeps to the first milestone
    if (aiSuggestion.tasks.length > 0 && newSteps.length > 0) {
      newSteps[0].substeps = aiSuggestion.tasks.map((task) => ({
        id: crypto.randomUUID(),
        title: task,
      }));
    }

    setFormData((current) => ({
      ...current,
      steps: [...current.steps, ...newSteps],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      // Reset form
      setFormData({
        title: '',
        description: '',
        lifeWheelCategory: initialCategory || 'health_fitness',
        startDate: '',
        targetDate: '',
        estimatedDurationDays: '',
        timingNotes: '',
        statusTag: DEFAULT_GOAL_STATUS,
        steps: [],
        alerts: [],
      });
      onClose();
    } catch (error) {
      console.error('Error saving life goal:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="life-goal-dialog-overlay" onClick={onClose}>
      <div className="life-goal-dialog" onClick={(e) => e.stopPropagation()}>
        <header className="life-goal-dialog__header">
          <h2>Create Life Goal</h2>
          <button
            type="button"
            className="life-goal-dialog__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>

        <div className="life-goal-dialog__tabs">
          <button
            type="button"
            className={`life-goal-dialog__tab ${activeTab === 'basic' ? 'life-goal-dialog__tab--active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            Basic Info
          </button>
          <button
            type="button"
            className={`life-goal-dialog__tab ${activeTab === 'steps' ? 'life-goal-dialog__tab--active' : ''}`}
            onClick={() => setActiveTab('steps')}
          >
            Steps ({formData.steps.length})
          </button>
          <button
            type="button"
            className={`life-goal-dialog__tab ${activeTab === 'timing' ? 'life-goal-dialog__tab--active' : ''}`}
            onClick={() => setActiveTab('timing')}
          >
            Timing
          </button>
          <button
            type="button"
            className={`life-goal-dialog__tab ${activeTab === 'alerts' ? 'life-goal-dialog__tab--active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            Alerts ({formData.alerts.length})
          </button>
        </div>

        <form className="life-goal-dialog__form" onSubmit={handleSubmit}>
          {activeTab === 'basic' && (
            <div className="life-goal-dialog__section">
              <label className="life-goal-dialog__field">
                <span>Goal Title *</span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={handleFieldChange('title')}
                  placeholder="e.g., Run a marathon"
                  required
                />
              </label>

              <label className="life-goal-dialog__field">
                <span>Description</span>
                <textarea
                  value={formData.description}
                  onChange={handleFieldChange('description')}
                  placeholder="Describe what success looks like and why this goal matters to you..."
                  rows={4}
                />
              </label>

              {/* AI Suggestion Section */}
              <div className="life-goal-dialog__ai-section">
                <button
                  type="button"
                  className="life-goal-dialog__ai-generate"
                  onClick={handleGenerateAiSuggestion}
                  disabled={!formData.description.trim() || aiLoading}
                >
                  {aiLoading ? '🤖 Generating...' : '✨ Generate with AI'}
                </button>

                {aiLoading && (
                  <p className="life-goal-dialog__ai-status">
                    Generating AI suggestion based on your description...
                  </p>
                )}

                {aiError && (
                  <div className="life-goal-dialog__ai-error">
                    <strong>Error:</strong> {aiError}
                  </div>
                )}

                {aiSuggestion && (
                  <div className="life-goal-dialog__ai-suggestion">
                    <h4>💡 AI Suggestion</h4>
                    <div className="life-goal-dialog__ai-content">
                      <div className="life-goal-dialog__ai-goal">
                        <strong>Goal:</strong>
                        <p>{aiSuggestion.goal}</p>
                      </div>
                      
                      {aiSuggestion.milestones.length > 0 && (
                        <div className="life-goal-dialog__ai-milestones">
                          <strong>Milestones:</strong>
                          <ul>
                            {aiSuggestion.milestones.map((milestone, index) => (
                              <li key={index}>{milestone}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {aiSuggestion.tasks.length > 0 && (
                        <div className="life-goal-dialog__ai-tasks">
                          <strong>Tasks:</strong>
                          <ul>
                            {aiSuggestion.tasks.map((task, index) => (
                              <li key={index}>{task}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <button
                        type="button"
                        className="life-goal-dialog__ai-use"
                        onClick={handleUseAiSuggestion}
                      >
                        ✓ Use this as goal
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <label className="life-goal-dialog__field">
                <span>Life Area</span>
                <select value={formData.lifeWheelCategory} onChange={handleFieldChange('lifeWheelCategory')}>
                  <option value="spirituality_community">Spirituality & Community</option>
                  <option value="finance_wealth">Finance & Wealth</option>
                  <option value="love_relations">Love & Relations</option>
                  <option value="fun_creativity">Fun & Creativity</option>
                  <option value="career_development">Career & Self Development</option>
                  <option value="health_fitness">Health & Fitness</option>
                  <option value="family_friends">Family & Friends</option>
                  <option value="living_spaces">Living Spaces</option>
                </select>
              </label>

              <label className="life-goal-dialog__field">
                <span>Status</span>
                <select value={formData.statusTag} onChange={handleFieldChange('statusTag')}>
                  {GOAL_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {activeTab === 'steps' && (
            <div className="life-goal-dialog__section">
              <div className="life-goal-dialog__steps-form">
                <h3>Add a Step</h3>
                <label className="life-goal-dialog__field">
                  <span>Step Title *</span>
                  <input
                    type="text"
                    value={currentStep.title || ''}
                    onChange={(e) => setCurrentStep({ ...currentStep, title: e.target.value })}
                    placeholder="e.g., Complete 5K training program"
                  />
                </label>

                <label className="life-goal-dialog__field">
                  <span>Step Description</span>
                  <textarea
                    value={currentStep.description || ''}
                    onChange={(e) => setCurrentStep({ ...currentStep, description: e.target.value })}
                    placeholder="Additional details about this step..."
                    rows={2}
                  />
                </label>

                <label className="life-goal-dialog__field">
                  <span>Due Date</span>
                  <input
                    type="date"
                    value={currentStep.dueDate || ''}
                    onChange={(e) => setCurrentStep({ ...currentStep, dueDate: e.target.value })}
                  />
                </label>

                <div className="life-goal-dialog__substeps">
                  <h4>Substeps</h4>
                  <div className="life-goal-dialog__substep-input">
                    <input
                      type="text"
                      value={currentSubstep}
                      onChange={(e) => setCurrentSubstep(e.target.value)}
                      placeholder="Add a substep..."
                    />
                    <button type="button" onClick={handleAddSubstep} disabled={!currentSubstep.trim()}>
                      Add
                    </button>
                  </div>
                  {currentStep.substeps && currentStep.substeps.length > 0 && (
                    <ul className="life-goal-dialog__substep-list">
                      {currentStep.substeps.map((substep) => (
                        <li key={substep.id}>
                          <span>{substep.title}</span>
                          <button type="button" onClick={() => handleRemoveSubstep(substep.id)}>
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  type="button"
                  className="life-goal-dialog__add-step"
                  onClick={handleAddStep}
                  disabled={!currentStep.title?.trim()}
                >
                  Add Step
                </button>
              </div>

              {formData.steps.length > 0 && (
                <div className="life-goal-dialog__steps-list">
                  <h3>Steps ({formData.steps.length})</h3>
                  <ul>
                    {formData.steps.map((step, index) => (
                      <li key={step.id} className="life-goal-dialog__step-item">
                        <div className="life-goal-dialog__step-header">
                          <span className="life-goal-dialog__step-number">{index + 1}.</span>
                          <strong>{step.title}</strong>
                          <button type="button" onClick={() => handleRemoveStep(step.id)}>
                            Remove
                          </button>
                        </div>
                        {step.description && <p>{step.description}</p>}
                        {step.dueDate && <p className="life-goal-dialog__step-date">Due: {step.dueDate}</p>}
                        {step.substeps.length > 0 && (
                          <ul className="life-goal-dialog__step-substeps">
                            {step.substeps.map((substep) => (
                              <li key={substep.id}>{substep.title}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timing' && (
            <div className="life-goal-dialog__section">
              <label className="life-goal-dialog__field">
                <span>Start Date</span>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={handleFieldChange('startDate')}
                />
              </label>

              <label className="life-goal-dialog__field">
                <span>Target Date</span>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={handleFieldChange('targetDate')}
                />
              </label>

              <label className="life-goal-dialog__field">
                <span>Estimated Duration (days)</span>
                <input
                  type="number"
                  value={formData.estimatedDurationDays}
                  onChange={handleFieldChange('estimatedDurationDays')}
                  placeholder="e.g., 90"
                  min="1"
                />
              </label>

              <label className="life-goal-dialog__field">
                <span>Timing Notes</span>
                <textarea
                  value={formData.timingNotes}
                  onChange={handleFieldChange('timingNotes')}
                  placeholder="Add notes about your schedule, milestones, or important dates..."
                  rows={4}
                />
              </label>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="life-goal-dialog__section">
              <div className="life-goal-dialog__alert-form">
                <h3>Add an Alert</h3>
                <p className="life-goal-dialog__hint">
                  Alerts work as PWA notifications and will appear even when the app is closed (on supported devices).
                </p>

                <label className="life-goal-dialog__field">
                  <span>Alert Type</span>
                  <select
                    value={currentAlert.alertType || 'reminder'}
                    onChange={(e) =>
                      setCurrentAlert({
                        ...currentAlert,
                        alertType: e.target.value as LifeGoalAlert['alertType'],
                      })
                    }
                  >
                    <option value="reminder">Reminder</option>
                    <option value="milestone">Milestone</option>
                    <option value="deadline">Deadline</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>

                <label className="life-goal-dialog__field">
                  <span>Alert Time *</span>
                  <input
                    type="datetime-local"
                    value={currentAlert.alertTime || ''}
                    onChange={(e) => setCurrentAlert({ ...currentAlert, alertTime: e.target.value })}
                  />
                </label>

                <label className="life-goal-dialog__field">
                  <span>Alert Title *</span>
                  <input
                    type="text"
                    value={currentAlert.title || ''}
                    onChange={(e) => setCurrentAlert({ ...currentAlert, title: e.target.value })}
                    placeholder="e.g., Time to train!"
                  />
                </label>

                <label className="life-goal-dialog__field">
                  <span>Alert Message</span>
                  <textarea
                    value={currentAlert.message || ''}
                    onChange={(e) => setCurrentAlert({ ...currentAlert, message: e.target.value })}
                    placeholder="Additional message for the notification..."
                    rows={2}
                  />
                </label>

                <label className="life-goal-dialog__field">
                  <span>Repeat</span>
                  <select
                    value={currentAlert.repeatPattern || 'once'}
                    onChange={(e) =>
                      setCurrentAlert({
                        ...currentAlert,
                        repeatPattern: e.target.value as LifeGoalAlert['repeatPattern'],
                      })
                    }
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="life-goal-dialog__add-alert"
                  onClick={handleAddAlert}
                  disabled={!currentAlert.title?.trim() || !currentAlert.alertTime}
                >
                  Add Alert
                </button>
              </div>

              {formData.alerts.length > 0 && (
                <div className="life-goal-dialog__alerts-list">
                  <h3>Alerts ({formData.alerts.length})</h3>
                  <ul>
                    {formData.alerts.map((alert) => (
                      <li key={alert.id} className="life-goal-dialog__alert-item">
                        <div className="life-goal-dialog__alert-header">
                          <strong>{alert.title}</strong>
                          <span className="life-goal-dialog__alert-type">{alert.alertType}</span>
                          <button type="button" onClick={() => handleRemoveAlert(alert.id)}>
                            Remove
                          </button>
                        </div>
                        <p className="life-goal-dialog__alert-time">
                          {new Date(alert.alertTime).toLocaleString()} • {alert.repeatPattern}
                        </p>
                        {alert.message && <p>{alert.message}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="life-goal-dialog__actions">
            <button type="button" className="life-goal-dialog__cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="life-goal-dialog__save" disabled={saving || !formData.title.trim()}>
              {saving ? 'Saving...' : 'Save Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
