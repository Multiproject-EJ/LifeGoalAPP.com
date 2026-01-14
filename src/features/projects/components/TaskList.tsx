import { useState, useMemo } from 'react';
import type { ProjectTask, TaskStatus } from '../../../types/actions';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: ProjectTask[];
  projectId: string;
  onAddTask: (title: string) => void;
  onCompleteTask: (id: string) => void;
  onUpdateTask: (id: string, title: string) => void;
  onDeleteTask: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function TaskList({
  tasks,
  projectId,
  onAddTask,
  onCompleteTask,
  onUpdateTask,
  onDeleteTask,
  onStatusChange,
}: TaskListProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Sort tasks: todo, in_progress, blocked, then done
  const statusOrder: Record<TaskStatus, number> = {
    todo: 1,
    in_progress: 2,
    blocked: 3,
    done: 4,
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [tasks]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      onAddTask(newTaskTitle.trim());
      setNewTaskTitle('');
    }
  };

  return (
    <div className="task-list">
      <div className="task-list__header">
        <h3>Tasks</h3>
        <span className="task-list__count">
          {tasks.filter((t) => t.completed).length}/{tasks.length} complete
        </span>
      </div>

      {sortedTasks.length === 0 ? (
        <div className="task-list__empty">
          <p>No tasks yet. Add your first task below.</p>
        </div>
      ) : (
        <div className="task-list__items">
          {sortedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={onCompleteTask}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}

      <form onSubmit={handleAddTask} className="task-list__add-form">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a new task..."
          className="task-list__add-input"
        />
        <button
          type="submit"
          className="task-list__add-button"
          disabled={!newTaskTitle.trim()}
        >
          Add Task
        </button>
      </form>
    </div>
  );
}
