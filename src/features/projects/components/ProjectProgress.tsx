import type { ProjectProgress as ProjectProgressType } from '../hooks/useProjectProgress';

interface ProjectProgressProps {
  progress: ProjectProgressType;
  color?: string;
}

export function ProjectProgress({ progress, color = '#6366f1' }: ProjectProgressProps) {
  const progressColor = progress.isOverdue ? '#ef4444' : color;

  return (
    <div className="project-progress">
      <div className="project-progress__bar-container">
        <div
          className="project-progress__bar"
          style={{
            width: `${progress.percentage}%`,
            backgroundColor: progressColor,
          }}
        />
      </div>
      <div className="project-progress__text">
        <span>{progress.completed}/{progress.total} tasks</span>
        <span className="project-progress__percentage">{progress.percentage}%</span>
      </div>
      {progress.daysUntilDue !== null && (
        <div className={`project-progress__due ${progress.isOverdue ? 'project-progress__due--overdue' : ''}`}>
          {progress.isOverdue
            ? `${Math.abs(progress.daysUntilDue)} days overdue`
            : `${progress.daysUntilDue} days remaining`}
        </div>
      )}
    </div>
  );
}
