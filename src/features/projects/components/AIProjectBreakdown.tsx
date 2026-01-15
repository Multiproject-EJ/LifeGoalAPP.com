import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Project, CreateProjectTaskInput } from '../../../types/actions';
import './AIProjectBreakdown.css';

interface AIProjectBreakdownProps {
  project: Project;
  session: Session | null;
  onAddTasks: (tasks: CreateProjectTaskInput[]) => Promise<void>;
  onClose: () => void;
}

interface TaskSuggestion {
  id: string;
  title: string;
  description?: string;
  estimatedHours?: number;
  selected: boolean;
}

export function AIProjectBreakdown({ project, session, onAddTasks, onClose }: AIProjectBreakdownProps) {
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateSuggestions = async () => {
    setIsGenerating(true);
    
    // Simulate AI "thinking" delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate suggestions based on project title/description
    const generated = generateTasksForProject(project);
    
    setSuggestions(generated.map((task, index) => ({
      id: `suggestion-${index}`,
      title: task.title,
      description: task.description,
      estimatedHours: task.estimatedHours,
      selected: true,
    })));
    
    setIsGenerating(false);
    setHasGenerated(true);
  };

  const handleToggleSuggestion = (id: string) => {
    setSuggestions(prev => prev.map(s => 
      s.id === id ? { ...s, selected: !s.selected } : s
    ));
  };

  const handleAddSelected = async () => {
    const selectedTasks: CreateProjectTaskInput[] = suggestions
      .filter(s => s.selected)
      .map((s, index) => ({
        title: s.title,
        description: s.description,
        estimated_hours: s.estimatedHours,
        order_index: index,
        status: 'todo' as const,
      }));
    
    await onAddTasks(selectedTasks);
    onClose();
  };

  return (
    <div className="ai-breakdown">
      <div className="ai-breakdown__header">
        <span className="ai-breakdown__icon">🤖</span>
        <h3 className="ai-breakdown__title">AI Project Breakdown</h3>
        <button className="ai-breakdown__close" onClick={onClose}>×</button>
      </div>
      
      <div className="ai-breakdown__body">
        {!hasGenerated && !isGenerating && (
          <div className="ai-breakdown__intro">
            <p>Let AI help break down "<strong>{project.title}</strong>" into actionable tasks.</p>
            <button 
              className="ai-breakdown__generate-btn"
              onClick={generateSuggestions}
            >
              ✨ Generate Tasks
            </button>
          </div>
        )}
        
        {isGenerating && (
          <div className="ai-breakdown__loading">
            <div className="ai-breakdown__typing">
              <span></span><span></span><span></span>
            </div>
            <p>Analyzing your project...</p>
          </div>
        )}
        
        {hasGenerated && (
          <>
            <p className="ai-breakdown__result-text">
              Here are {suggestions.length} suggested tasks:
            </p>
            <ul className="ai-breakdown__suggestions">
              {suggestions.map(suggestion => (
                <li 
                  key={suggestion.id}
                  className={`ai-breakdown__suggestion ${suggestion.selected ? 'ai-breakdown__suggestion--selected' : ''}`}
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={suggestion.selected}
                      onChange={() => handleToggleSuggestion(suggestion.id)}
                    />
                    <span className="ai-breakdown__suggestion-title">{suggestion.title}</span>
                    {suggestion.estimatedHours && (
                      <span className="ai-breakdown__suggestion-hours">
                        ~{suggestion.estimatedHours}h
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
            <div className="ai-breakdown__actions">
              <button 
                className="ai-breakdown__add-btn"
                onClick={handleAddSelected}
                disabled={suggestions.filter(s => s.selected).length === 0}
              >
                Add {suggestions.filter(s => s.selected).length} Tasks
              </button>
              <button 
                className="ai-breakdown__regenerate-btn"
                onClick={generateSuggestions}
              >
                🔄 Regenerate
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper function to generate tasks based on project
function generateTasksForProject(project: Project): Array<{
  title: string;
  description?: string;
  estimatedHours?: number;
}> {
  const title = project.title.toLowerCase();
  const description = project.description?.toLowerCase() || '';
  const combined = `${title} ${description}`;
  
  // Common project patterns with smart suggestions
  if (combined.includes('website') || combined.includes('web app') || combined.includes('landing page')) {
    return [
      { title: 'Define requirements and scope', estimatedHours: 2 },
      { title: 'Create wireframes/mockups', estimatedHours: 4 },
      { title: 'Set up development environment', estimatedHours: 1 },
      { title: 'Build page structure (HTML/components)', estimatedHours: 4 },
      { title: 'Implement styling and responsive design', estimatedHours: 6 },
      { title: 'Add interactivity and functionality', estimatedHours: 8 },
      { title: 'Test across browsers and devices', estimatedHours: 2 },
      { title: 'Deploy to production', estimatedHours: 2 },
    ];
  }
  
  if (combined.includes('app') || combined.includes('application') || combined.includes('mobile')) {
    return [
      { title: 'Define user stories and requirements', estimatedHours: 3 },
      { title: 'Design UI/UX mockups', estimatedHours: 6 },
      { title: 'Set up project and dependencies', estimatedHours: 2 },
      { title: 'Implement core features', estimatedHours: 16 },
      { title: 'Add authentication (if needed)', estimatedHours: 4 },
      { title: 'Implement data persistence', estimatedHours: 4 },
      { title: 'Write tests', estimatedHours: 4 },
      { title: 'Beta testing and bug fixes', estimatedHours: 6 },
      { title: 'Prepare for launch', estimatedHours: 2 },
    ];
  }
  
  if (combined.includes('learn') || combined.includes('study') || combined.includes('course')) {
    return [
      { title: 'Research available resources', estimatedHours: 2 },
      { title: 'Create study schedule', estimatedHours: 1 },
      { title: 'Complete introduction/fundamentals', estimatedHours: 4 },
      { title: 'Practice with exercises', estimatedHours: 6 },
      { title: 'Build a small project', estimatedHours: 8 },
      { title: 'Review and consolidate knowledge', estimatedHours: 2 },
      { title: 'Take assessment/quiz', estimatedHours: 1 },
    ];
  }
  
  if (combined.includes('launch') || combined.includes('release') || combined.includes('ship')) {
    return [
      { title: 'Finalize feature set', estimatedHours: 2 },
      { title: 'Complete QA testing', estimatedHours: 4 },
      { title: 'Prepare marketing materials', estimatedHours: 4 },
      { title: 'Set up analytics', estimatedHours: 2 },
      { title: 'Create launch checklist', estimatedHours: 1 },
      { title: 'Soft launch to beta users', estimatedHours: 2 },
      { title: 'Gather feedback and iterate', estimatedHours: 4 },
      { title: 'Public launch', estimatedHours: 2 },
    ];
  }
  
  if (combined.includes('write') || combined.includes('blog') || combined.includes('article') || combined.includes('content')) {
    return [
      { title: 'Research topic thoroughly', estimatedHours: 2 },
      { title: 'Create outline', estimatedHours: 1 },
      { title: 'Write first draft', estimatedHours: 3 },
      { title: 'Edit and revise', estimatedHours: 2 },
      { title: 'Add images/media', estimatedHours: 1 },
      { title: 'Proofread final version', estimatedHours: 1 },
      { title: 'Publish and promote', estimatedHours: 1 },
    ];
  }
  
  if (combined.includes('event') || combined.includes('party') || combined.includes('meeting')) {
    return [
      { title: 'Define event goals and audience', estimatedHours: 1 },
      { title: 'Choose date and venue', estimatedHours: 2 },
      { title: 'Create guest list', estimatedHours: 1 },
      { title: 'Send invitations', estimatedHours: 1 },
      { title: 'Plan agenda/activities', estimatedHours: 2 },
      { title: 'Arrange catering/refreshments', estimatedHours: 2 },
      { title: 'Prepare materials/decorations', estimatedHours: 3 },
      { title: 'Follow up after event', estimatedHours: 1 },
    ];
  }
  
  // Generic fallback for any project
  return [
    { title: 'Define project goals and success criteria', estimatedHours: 1 },
    { title: 'Break down into milestones', estimatedHours: 1 },
    { title: 'Identify required resources', estimatedHours: 1 },
    { title: 'Complete first milestone', estimatedHours: 4 },
    { title: 'Review progress and adjust', estimatedHours: 1 },
    { title: 'Complete remaining milestones', estimatedHours: 8 },
    { title: 'Final review and polish', estimatedHours: 2 },
    { title: 'Mark project complete', estimatedHours: 0.5 },
  ];
}
