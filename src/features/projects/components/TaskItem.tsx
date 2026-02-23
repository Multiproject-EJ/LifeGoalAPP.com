import { useState } from 'react';
import type { ProjectTaskItem } from '../../../types/actions';
import { TASK_STATUS_CONFIG } from '../../../types/actions';

interface TaskItemProps {
  task: ProjectTaskItem;
  onComplete: (id: string) => void;
  onUpdate: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onStartTimer?: (task: ProjectTaskItem) => void;
}

export function TaskItem({ task, onComplete, onUpdate, onDelete, onStatusChange, onStartTimer }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const statusConfig = TASK_STATUS_CONFIG[task.status];
  const isActionTask = task.source === 'action';

  const handleComplete = () => {
    if (!task.completed) {
      onComplete(task.id);
    }
  };

  const handleSave = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdate(task.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`task-item ${task.completed ? 'task-item--completed' : ''}`}>
      <div className="task-item__main">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={handleComplete}
          className="task-item__checkbox"
          aria-label={`Mark ${task.title} as complete`}
        />
        
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="task-item__edit-input"
            autoFocus
          />
        ) : (
          <span
            className="task-item__title"
            onClick={() => setIsEditing(true)}
          >
            {task.title}
          </span>
        )}
      </div>

      <div className="task-item__meta">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className="task-item__status"
          style={{ color: statusConfig.color }}
          disabled={isActionTask}
        >
          {Object.entries(TASK_STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.icon} {config.label}
            </option>
          ))}
        </select>

        {task.due_date && (
          <span className="task-item__due-date">
            Due: {formatDate(task.due_date)}
          </span>
        )}

        {onStartTimer && (
          <button
            onClick={() => onStartTimer(task)}
            className="task-item__timer"
            aria-label={`Start timer for ${task.title}`}
            title="Start timer"
          >
            ⏱️
          </button>
        )}

        <button
          onClick={() => onDelete(task.id)}
          className="task-item__delete"
          aria-label={`Delete ${task.title}`}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
