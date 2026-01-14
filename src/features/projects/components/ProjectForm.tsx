import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Project, CreateProjectInput, ProjectPriority, ProjectStatus } from '../../../types/actions';
import { PROJECT_STATUS_CONFIG } from '../../../types/actions';
import { ProjectGoalLink } from './ProjectGoalLink';

interface ProjectFormProps {
  session: Session | null;
  project?: Project | null;
  onSubmit: (input: CreateProjectInput) => Promise<void>;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: ProjectPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const ICON_OPTIONS = ['📋', '🎯', '💼', '🚀', '📱', '💡', '🎨', '🔧', '📚', '🏆'];

export function ProjectForm({ session, project, onSubmit, onClose }: ProjectFormProps) {
  const [title, setTitle] = useState(project?.title ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [priority, setPriority] = useState<ProjectPriority | ''>(project?.priority ?? '');
  const [goalId, setGoalId] = useState<string | null>(project?.goal_id ?? null);
  const [startDate, setStartDate] = useState(project?.start_date ?? '');
  const [targetDate, setTargetDate] = useState(project?.target_date ?? '');
  const [color, setColor] = useState(project?.color ?? '#6366f1');
  const [icon, setIcon] = useState(project?.icon ?? '📋');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const input: CreateProjectInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority: priority || undefined,
        goal_id: goalId || undefined,
        start_date: startDate || undefined,
        target_date: targetDate || undefined,
        color,
        icon,
      };

      await onSubmit(input);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="project-form-overlay" onClick={onClose}>
      <div className="project-form" onClick={(e) => e.stopPropagation()}>
        <div className="project-form__header">
          <h2>{project ? 'Edit Project' : 'Create New Project'}</h2>
          <button
            onClick={onClose}
            className="project-form__close"
            aria-label="Close form"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="project-form__body">
          {error && (
            <div className="project-form__error" role="alert">
              {error}
            </div>
          )}

          <div className="project-form__field">
            <label htmlFor="project-title">
              Title <span className="project-form__required">*</span>
            </label>
            <input
              id="project-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter project title"
              required
              autoFocus
            />
          </div>

          <div className="project-form__field">
            <label htmlFor="project-description">Description</label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project"
              rows={3}
            />
          </div>

          <div className="project-form__row">
            <div className="project-form__field">
              <label htmlFor="project-priority">Priority</label>
              <select
                id="project-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProjectPriority)}
              >
                <option value="">No priority</option>
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="project-form__field">
              <label htmlFor="project-icon">Icon</label>
              <select
                id="project-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
              >
                {ICON_OPTIONS.map((ico) => (
                  <option key={ico} value={ico}>
                    {ico}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="project-form__row">
            <div className="project-form__field">
              <label htmlFor="project-start-date">Start Date</label>
              <input
                id="project-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="project-form__field">
              <label htmlFor="project-target-date">Target Date</label>
              <input
                id="project-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          <div className="project-form__field">
            <label htmlFor="project-color">Color</label>
            <input
              id="project-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>

          <div className="project-form__field">
            <ProjectGoalLink
              session={session}
              currentGoalId={goalId}
              onLink={setGoalId}
            />
          </div>

          <div className="project-form__actions">
            <button type="button" onClick={onClose} className="project-form__cancel">
              Cancel
            </button>
            <button
              type="submit"
              className="project-form__submit"
              disabled={submitting || !title.trim()}
            >
              {submitting ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
