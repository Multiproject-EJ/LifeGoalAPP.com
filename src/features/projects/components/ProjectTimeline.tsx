import { useState, useMemo } from 'react';
import type { Project } from '../../../types/actions';
import './ProjectTimeline.css';

interface ProjectTimelineProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
}

type TimelineZoom = 'day' | 'week' | 'month';

export function ProjectTimeline({ projects, onProjectClick }: ProjectTimelineProps) {
  const [zoom, setZoom] = useState<TimelineZoom>('week');
  
  // Calculate date range
  const { startDate, endDate, totalDays } = useMemo(() => {
    const today = new Date();
    const dates = projects.flatMap(p => [
      p.start_date ? new Date(p.start_date) : today,
      p.target_date ? new Date(p.target_date) : today,
    ]);
    
    const minDate = new Date(Math.min(...dates.map(d => d.getTime()), today.getTime()));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime()), today.getTime()));
    
    // Add padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);
    
    const days = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return { startDate: minDate, endDate: maxDate, totalDays: days };
  }, [projects]);

  const getBarStyle = (project: Project) => {
    const start = project.start_date ? new Date(project.start_date) : new Date();
    const end = project.target_date ? new Date(project.target_date) : new Date();
    
    const startOffset = Math.max(0, (start.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const getTodayPosition = () => {
    const today = new Date();
    const offset = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return `${(offset / totalDays) * 100}%`;
  };

  const isOverdue = (project: Project) => {
    if (!project.target_date || project.status === 'completed') return false;
    return new Date(project.target_date) < new Date();
  };

  return (
    <div className="project-timeline">
      <div className="project-timeline__controls">
        <span className="project-timeline__label">Zoom:</span>
        {(['day', 'week', 'month'] as TimelineZoom[]).map(z => (
          <button
            key={z}
            className={`project-timeline__zoom-btn ${zoom === z ? 'project-timeline__zoom-btn--active' : ''}`}
            onClick={() => setZoom(z)}
          >
            {z.charAt(0).toUpperCase() + z.slice(1)}
          </button>
        ))}
      </div>
      
      <div className="project-timeline__chart">
        {/* Today marker */}
        <div 
          className="project-timeline__today" 
          style={{ left: getTodayPosition() }}
        >
          <span className="project-timeline__today-label">Today</span>
        </div>
        
        {/* Project bars */}
        {projects.filter(p => p.status !== 'archived').map(project => (
          <div key={project.id} className="project-timeline__row">
            <div className="project-timeline__project-name">
              {project.icon} {project.title}
            </div>
            <div className="project-timeline__bar-container">
              <div
                className={`project-timeline__bar ${isOverdue(project) ? 'project-timeline__bar--overdue' : ''}`}
                style={getBarStyle(project)}
                onClick={() => onProjectClick(project)}
              >
                <span className="project-timeline__bar-label">{project.title}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
