import type { Project } from '../../../types/actions';
import { PROJECT_STATUS_CONFIG } from '../../../types/actions';
import type { ProjectProgress } from '../hooks/useProjectProgress';

interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  onSelect: () => void;
  progress: ProjectProgress;
}

export function ProjectCard({ project, isSelected, onSelect, progress }: ProjectCardProps) {
  const statusConfig = PROJECT_STATUS_CONFIG[project.status];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div
      className={`project-card ${isSelected ? 'project-card--selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="project-card__header">
        <span className="project-card__icon">{project.icon}</span>
        <h3 className="project-card__title">{project.title}</h3>
      </div>

      <div className="project-card__progress">
        <div
          className="project-card__progress-bar"
          style={{
            width: `${progress.percentage}%`,
            backgroundColor: progress.isOverdue ? '#ef4444' : project.color,
          }}
        />
      </div>
      <span className="project-card__progress-text">
        {progress.completed}/{progress.total} tasks ({progress.percentage}%)
      </span>

      <div className="project-card__footer">
        <span
          className="project-card__status"
          style={{ color: statusConfig.color }}
        >
          {statusConfig.icon} {statusConfig.label}
        </span>
        {project.target_date && (
          <span
            className={`project-card__date ${progress.isOverdue ? 'project-card__date--overdue' : ''}`}
          >
            Due: {formatDate(project.target_date)}
          </span>
        )}
      </div>

      {project.priority && (
        <div className={`project-card__priority project-card__priority--${project.priority}`}>
          {project.priority.toUpperCase()}
        </div>
      )}
    </div>
  );
}
