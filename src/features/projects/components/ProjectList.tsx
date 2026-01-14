import type { Project } from '../../../types/actions';
import { ProjectCard } from './ProjectCard';
import type { ProjectProgress } from '../hooks/useProjectProgress';

interface ProjectListProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  projectProgress: Map<string, ProjectProgress>;
}

export function ProjectList({ projects, selectedId, onSelect, projectProgress }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="project-list project-list--empty">
        <div className="project-list__empty-state">
          <span className="project-list__empty-icon">📋</span>
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="project-list">
      {projects.map((project) => {
        const progress = projectProgress.get(project.id) ?? {
          completed: 0,
          total: 0,
          percentage: 0,
          daysUntilDue: null,
          isOverdue: false,
        };

        return (
          <ProjectCard
            key={project.id}
            project={project}
            isSelected={selectedId === project.id}
            onSelect={() => onSelect(project.id)}
            progress={progress}
          />
        );
      })}
    </div>
  );
}
