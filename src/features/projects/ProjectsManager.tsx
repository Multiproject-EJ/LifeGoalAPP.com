import { useState, useCallback, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useProjects } from './hooks/useProjects';
import { useProjectTasks } from './hooks/useProjectTasks';
import { useProjectProgress } from './hooks/useProjectProgress';
import { ProjectList } from './components/ProjectList';
import { ProjectDetail } from './components/ProjectDetail';
import { ProjectForm } from './components/ProjectForm';
import { ProjectBoard } from './components/ProjectBoard';
import { ProjectTimeline } from './components/ProjectTimeline';
import type { Project, ProjectStatus, CreateProjectInput, TaskStatus } from '../../types/actions';
import { PROJECT_STATUS_CONFIG } from '../../types/actions';
import './ProjectsManager.css';

interface ProjectsManagerProps {
  session: Session | null;
  onNavigateToActions?: () => void;
}

export function ProjectsManager({ session, onNavigateToActions }: ProjectsManagerProps) {
  const { projects, loading, error, createProject, updateProject, deleteProject, completeProject, refresh } = useProjects(session);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [currentView, setCurrentView] = useState<'list' | 'board' | 'timeline'>('list');

  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? null;
  
  // Fetch tasks for selected project (for board view)
  const { tasks, updateTask } = useProjectTasks(session, selectedProjectId ?? '');

  // Handler for updating task status from board view
  const handleTaskStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    await updateTask(taskId, { status: newStatus });
  }, [updateTask]);

  // Handler for clicking on a task in board view (placeholder for now)
  const handleTaskClick = useCallback((task: any) => {
    // TODO: Implement task detail modal in future phase
  }, []);

  // Calculate progress for all projects
  // NOTE: This is a simplified implementation showing 0 progress for list view.
  // The actual progress is calculated in ProjectDetail when a project is selected
  // and tasks are fetched. To show accurate progress in the list, we would need to
  // fetch tasks for all projects, which could be inefficient for many projects.
  // Consider implementing a server-side aggregate or caching strategy in future phases.
  const projectProgress = useMemo(() => {
    const progressMap = new Map();
    projects.forEach((project) => {
      progressMap.set(project.id, {
        completed: 0,
        total: 0,
        percentage: 0,
        daysUntilDue: null,
        isOverdue: false,
      });
    });
    return progressMap;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'all') {
      return projects;
    }
    return projects.filter(p => p.status === statusFilter);
  }, [projects, statusFilter]);

  const handleCreateProject = useCallback(async (input: CreateProjectInput) => {
    const { error } = await createProject(input);
    if (!error) {
      setShowForm(false);
    }
  }, [createProject]);

  const handleUpdateProject = useCallback(async (id: string, input: any) => {
    await updateProject(id, input);
    refresh();
  }, [updateProject, refresh]);

  const handleDeleteProject = useCallback(async (id: string) => {
    await deleteProject(id);
    setSelectedProjectId(null);
  }, [deleteProject]);

  const handleCompleteProject = useCallback(async (id: string) => {
    await completeProject(id);
    refresh();
  }, [completeProject, refresh]);

  const handleNewProject = () => {
    setEditingProject(null);
    setShowForm(true);
  };

  const handleEditProject = () => {
    if (selectedProject) {
      setEditingProject(selectedProject);
      setShowForm(true);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProject(null);
  };

  if (loading) {
    return (
      <div className="projects-manager projects-manager--loading">
        <p>Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="projects-manager projects-manager--error">
        <p>Error: {error}</p>
      </div>
    );
  }

  const statusFilters: Array<{ value: ProjectStatus | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'planning', label: PROJECT_STATUS_CONFIG.planning.label },
    { value: 'active', label: PROJECT_STATUS_CONFIG.active.label },
    { value: 'on_hold', label: PROJECT_STATUS_CONFIG.on_hold.label },
    { value: 'completed', label: PROJECT_STATUS_CONFIG.completed.label },
  ];

  return (
    <div className="projects-manager">
      <header className="projects-manager__header">
        <div className="projects-manager__title-section">
          <h1>Projects</h1>
          <p className="projects-manager__subtitle">
            Manage your multi-step initiatives and track progress
          </p>
        </div>
        <div className="projects-manager__header-actions">
          {onNavigateToActions && (
            <button
              className="projects-manager__actions-icon"
              onClick={onNavigateToActions}
              type="button"
              aria-label="Go to Actions"
              title="Go to Actions"
            >
              ⚡
            </button>
          )}
          <button
            onClick={handleNewProject}
            className="projects-manager__new-button"
          >
            + New Project
          </button>
        </div>
      </header>

      <div className="projects-manager__view-switcher">
        <button 
          className={`projects-manager__view-btn ${currentView === 'list' ? 'projects-manager__view-btn--active' : ''}`}
          onClick={() => setCurrentView('list')}
        >
          📋 List
        </button>
        <button 
          className={`projects-manager__view-btn ${currentView === 'board' ? 'projects-manager__view-btn--active' : ''}`}
          onClick={() => setCurrentView('board')}
          disabled={!selectedProject}
          title={!selectedProject ? 'Select a project to view board' : ''}
        >
          📊 Board
        </button>
        <button 
          className={`projects-manager__view-btn ${currentView === 'timeline' ? 'projects-manager__view-btn--active' : ''}`}
          onClick={() => setCurrentView('timeline')}
        >
          📅 Timeline
        </button>
      </div>

      <div className="projects-manager__filters">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`projects-manager__filter ${
              statusFilter === filter.value ? 'projects-manager__filter--active' : ''
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="projects-manager__content">
        {currentView === 'list' && (
          <>
            <div className="projects-manager__list-section">
              <ProjectList
                projects={filteredProjects}
                selectedId={selectedProjectId}
                onSelect={setSelectedProjectId}
                projectProgress={projectProgress}
              />
            </div>

            {selectedProject && (
              <div className="projects-manager__detail-section">
                <ProjectDetail
                  project={selectedProject}
                  session={session}
                  onUpdate={handleUpdateProject}
                  onDelete={handleDeleteProject}
                  onComplete={handleCompleteProject}
                  onClose={() => setSelectedProjectId(null)}
                  onEdit={handleEditProject}
                />
              </div>
            )}
          </>
        )}

        {currentView === 'board' && selectedProject && (
          <div className="projects-manager__board-view">
            <ProjectBoard
              projectId={selectedProject.id}
              tasks={tasks}
              onTaskStatusChange={handleTaskStatusChange}
              onTaskClick={handleTaskClick}
            />
          </div>
        )}

        {currentView === 'timeline' && (
          <div className="projects-manager__timeline-view">
            <ProjectTimeline
              projects={filteredProjects}
              onProjectClick={(project) => {
                setSelectedProjectId(project.id);
                setCurrentView('list');
              }}
            />
          </div>
        )}
      </div>

      {showForm && (
        <ProjectForm
          session={session}
          project={editingProject}
          onSubmit={editingProject ? 
            (input) => handleUpdateProject(editingProject.id, input) : 
            handleCreateProject
          }
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
