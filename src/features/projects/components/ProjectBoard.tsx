import { useState } from 'react';
import type { ProjectTaskItem, TaskStatus } from '../../../types/actions';
import './ProjectBoard.css';

interface ProjectBoardProps {
  projectId: string;
  tasks: ProjectTaskItem[];
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onTaskClick: (task: ProjectTaskItem) => void;
}

const COLUMNS: { status: TaskStatus; label: string; icon: string }[] = [
  { status: 'todo', label: 'To Do', icon: '📋' },
  { status: 'in_progress', label: 'In Progress', icon: '🚀' },
  { status: 'blocked', label: 'Blocked', icon: '🚫' },
  { status: 'done', label: 'Done', icon: '✅' },
];

export function ProjectBoard({ projectId, tasks, onTaskStatusChange, onTaskClick }: ProjectBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const getTasksByStatus = (status: TaskStatus) => 
    tasks.filter(t => t.status === status);

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: TaskStatus) => {
    if (draggedTaskId) {
      await onTaskStatusChange(draggedTaskId, status);
      setDraggedTaskId(null);
    }
  };

  const isOverdue = (task: ProjectTaskItem) => {
    if (!task.due_date || task.completed) return false;
    return new Date(task.due_date) < new Date();
  };

  return (
    <div className="project-board">
      {COLUMNS.map(column => (
        <div
          key={column.status}
          className="project-board__column"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(column.status)}
        >
          <div className="project-board__column-header">
            <span className="project-board__column-icon">{column.icon}</span>
            <span className="project-board__column-title">{column.label}</span>
            <span className="project-board__column-count">
              {getTasksByStatus(column.status).length}
            </span>
          </div>
          <div className="project-board__column-tasks">
            {getTasksByStatus(column.status).map(task => (
              <div
                key={task.id}
                className={`project-board__task ${isOverdue(task) ? 'project-board__task--overdue' : ''}`}
                draggable={task.source !== 'action'}
                onDragStart={() => {
                  if (task.source !== 'action') {
                    handleDragStart(task.id);
                  }
                }}
                onClick={() => onTaskClick(task)}
              >
                <span className="project-board__task-title">{task.title}</span>
                {task.due_date && (
                  <span className="project-board__task-due">
                    {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
