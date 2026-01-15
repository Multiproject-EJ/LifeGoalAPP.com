import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Project, UpdateProjectInput, CreateProjectTaskInput } from '../../../types/actions';
import { PROJECT_STATUS_CONFIG } from '../../../types/actions';
import { useProjectTasks } from '../hooks/useProjectTasks';
import { useProjectProgress } from '../hooks/useProjectProgress';
import { useGamification } from '../../../hooks/useGamification';
import { ProjectProgress } from './ProjectProgress';
import { TaskList } from './TaskList';
import { AIProjectBreakdown } from './AIProjectBreakdown';

interface ProjectDetailProps {
  project: Project;
  session: Session | null;
  onUpdate: (id: string, input: UpdateProjectInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onClose: () => void;
  onEdit: () => void;
}

export function ProjectDetail({
  project,
  session,
  onUpdate,
  onDelete,
  onComplete,
  onClose,
  onEdit,
}: ProjectDetailProps) {
  const { tasks, createTask, updateTask, deleteTask, completeTask } = useProjectTasks(session, project.id);
  const progress = useProjectProgress(project, tasks);
  const { earnXP } = useGamification(session);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAIBreakdown, setShowAIBreakdown] = useState(false);

  const statusConfig = PROJECT_STATUS_CONFIG[project.status];

  const handleAddTask = async (title: string) => {
    await createTask({
      project_id: project.id,
      title,
    });
  };

  const handleUpdateTask = async (id: string, title: string) => {
    await updateTask(id, { title });
  };

  const handleCompleteTask = async (id: string) => {
    await completeTask(id);
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('Delete this task?')) {
      await deleteTask(id);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateTask(id, { status: status as any });
  };

  const handleComplete = async () => {
    if (confirm('Mark this project as complete?')) {
      await onComplete(project.id);
    }
  };

  const handleArchive = async () => {
    if (confirm('Archive this project?')) {
      await onUpdate(project.id, { status: 'archived' });
    }
  };

  const handleDelete = async () => {
    if (showDeleteConfirm) {
      await onDelete(project.id);
      onClose();
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleAIAddTasks = async (aiTasks: CreateProjectTaskInput[]) => {
    // Add all tasks from AI
    for (const task of aiTasks) {
      await createTask({
        project_id: project.id,
        ...task,
      });
    }
    // Award XP for using AI assistance
    if (aiTasks.length > 0) {
      earnXP(10, 'ai_breakdown_used', project.id);
    }
  };

  return (
    <div className="project-detail">
      <div className="project-detail__header">
        <button
          onClick={onClose}
          className="project-detail__close"
          aria-label="Close detail panel"
        >
          ←
        </button>
        <span className="project-detail__icon">{project.icon}</span>
        <h2 className="project-detail__title">{project.title}</h2>
      </div>

      <div className="project-detail__body">
        <div className="project-detail__info">
          {project.description && (
            <p className="project-detail__description">{project.description}</p>
          )}

          <div className="project-detail__meta">
            <div className="project-detail__meta-item">
              <span className="project-detail__meta-label">Status:</span>
              <span
                className="project-detail__meta-value"
                style={{ color: statusConfig.color }}
              >
                {statusConfig.icon} {statusConfig.label}
              </span>
            </div>

            {project.priority && (
              <div className="project-detail__meta-item">
                <span className="project-detail__meta-label">Priority:</span>
                <span className={`project-detail__priority project-detail__priority--${project.priority}`}>
                  {project.priority.toUpperCase()}
                </span>
              </div>
            )}

            {project.start_date && (
              <div className="project-detail__meta-item">
                <span className="project-detail__meta-label">Started:</span>
                <span className="project-detail__meta-value">
                  {formatDate(project.start_date)}
                </span>
              </div>
            )}

            {project.target_date && (
              <div className="project-detail__meta-item">
                <span className="project-detail__meta-label">Target:</span>
                <span className="project-detail__meta-value">
                  {formatDate(project.target_date)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="project-detail__progress">
          <h3>Progress</h3>
          <ProjectProgress progress={progress} color={project.color} />
        </div>

        <div className="project-detail__tasks">
          <div className="project-detail__tasks-header">
            <h3>Tasks</h3>
            <button 
              className="project-detail__ai-btn"
              onClick={() => setShowAIBreakdown(true)}
              title="Break down with AI"
            >
              🤖 AI Breakdown
            </button>
          </div>
          <TaskList
            tasks={tasks}
            projectId={project.id}
            onAddTask={handleAddTask}
            onCompleteTask={handleCompleteTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>

      <div className="project-detail__actions">
        <button onClick={onEdit} className="project-detail__action">
          ✏️ Edit
        </button>
        
        {project.status !== 'completed' && (
          <button
            onClick={handleComplete}
            className="project-detail__action project-detail__action--complete"
          >
            ✅ Complete
          </button>
        )}

        {project.status !== 'archived' && (
          <button
            onClick={handleArchive}
            className="project-detail__action"
          >
            📦 Archive
          </button>
        )}

        <button
          onClick={handleDelete}
          className={`project-detail__action project-detail__action--delete ${
            showDeleteConfirm ? 'project-detail__action--confirm' : ''
          }`}
        >
          {showDeleteConfirm ? '⚠️ Confirm Delete' : '🗑️ Delete'}
        </button>
      </div>

      {showAIBreakdown && (
        <div className="project-detail__ai-overlay">
          <div className="project-detail__ai-backdrop" onClick={() => setShowAIBreakdown(false)} />
          <AIProjectBreakdown
            project={project}
            session={session}
            onAddTasks={handleAIAddTasks}
            onClose={() => setShowAIBreakdown(false)}
          />
        </div>
      )}
    </div>
  );
}
