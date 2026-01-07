import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, Menu, X, Plus, Calendar, CheckSquare, TrendingUp, Target, Book, Heart, Compass, Grid, Search, ChevronDown, AlertCircle, FileText, Settings, List, Layers, Filter, Tag, Clock, Star, Archive, Trash2, RefreshCw, Download, Upload, Copy, Edit, Eye, EyeOff, Lock, Unlock, Save, Zap, Activity, BarChart2, PieChart, TrendingDown, Award, Bell, User, Users, Mail, Phone, MapPin, Link as LinkIcon, Image, Video, Music, File, Folder, Home, MoreHorizontal, MoreVertical, Check, AlertTriangle, Info, HelpCircle, ExternalLink } from 'lucide-react';
import './App.css';

// Feature Imports
import { ProjectsTab } from './features/projects';
import { TasksTab } from './features/tasks';
import { GoalsTab } from './features/goals';
import { JournalTab } from './features/journal';
import { FinanceTab } from './features/finance';
import { LearningTab } from './features/learning';
import { RelationshipsTab } from './features/relationships';
import { InsightsTab } from './features/insights';
import { CalendarTab } from './features/calendar';
import { NotesTab } from './features/notes';
import { TimeTrackingTab } from './features/timetracking';
import { HabitsTab } from './features/habits';
import { IdeasTab } from './features/ideas';
import { SettingsTab } from './features/settings';
import { MindMapTab } from './features/mindmap';
import { VisionBoardTab } from './features/visionboard';
import { DecisionLogTab } from './features/decisionlog';
import { ResourcesTab } from './features/resources';
import { BodyTab } from './features/body';

// Types
type WorkspaceId = 'overview' | 'projects' | 'tasks' | 'goals' | 'journal' | 'finance' | 'learning' | 'relationships' | 'insights' | 'calendar' | 'notes' | 'timetracking' | 'body' | 'ideas' | 'mindmap' | 'visionboard' | 'decisionlog' | 'resources' | 'settings';

interface WorkspaceNavItem {
  id: WorkspaceId;
  label: string;
  icon: string;
  summary: string;
  category?: 'core' | 'personal' | 'productivity' | 'reflection' | 'system';
  shortLabel?: string;
}

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  timezone: string;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: boolean;
  };
}

interface Session {
  user: UserProfile;
  isAuthenticated: boolean;
  startTime: Date;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'create' | 'view' | 'analyze';
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  action?: () => void;
}

// Constants
const BASE_WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  { id: 'overview', label: 'Overview', summary: 'Your life dashboard at a glance.', icon: '🏠', category: 'core', shortLabel: 'HOME' },
  { id: 'projects', label: 'Projects', summary: 'Manage and track all your projects.', icon: '📁', category: 'productivity', shortLabel: 'PROJECTS' },
  { id: 'tasks', label: 'Tasks', summary: 'Organize your to-dos and action items.', icon: '✅', category: 'productivity', shortLabel: 'TASKS' },
  { id: 'goals', label: 'Goals', summary: 'Define and pursue your aspirations.', icon: '🎯', category: 'core', shortLabel: 'GOALS' },
  { id: 'journal', label: 'Journal', summary: 'Reflect on your thoughts and experiences.', icon: '📖', category: 'reflection', shortLabel: 'JOURNAL' },
  { id: 'finance', label: 'Finance', summary: 'Track income, expenses, and savings.', icon: '💰', category: 'personal', shortLabel: 'FINANCE' },
  { id: 'learning', label: 'Learning', summary: 'Courses, books, and knowledge acquisition.', icon: '🎓', category: 'personal', shortLabel: 'LEARNING' },
  { id: 'relationships', label: 'Relationships', summary: 'Nurture connections with people who matter.', icon: '❤️', category: 'personal', shortLabel: 'PEOPLE' },
  { id: 'body', label: 'Body & Vitality', summary: 'Track physical health, fitness goals, and wellness metrics.', icon: '💪', shortLabel: 'BODY' },
  { id: 'insights', label: 'Insights', summary: 'Analytics and patterns from your data.', icon: '📊', category: 'reflection', shortLabel: 'INSIGHTS' },
  { id: 'calendar', label: 'Calendar', summary: 'Schedule and time management.', icon: '📅', category: 'productivity', shortLabel: 'CALENDAR' },
  { id: 'notes', label: 'Notes', summary: 'Quick captures and reference materials.', icon: '📝', category: 'productivity', shortLabel: 'NOTES' },
  { id: 'timetracking', label: 'Time Tracking', summary: 'Monitor how you spend your time.', icon: '⏱️', category: 'productivity', shortLabel: 'TIME' },
  { id: 'ideas', label: 'Ideas', summary: 'Capture sparks of inspiration and innovation.', icon: '💡', category: 'reflection', shortLabel: 'IDEAS' },
  { id: 'mindmap', label: 'Mind Maps', summary: 'Visualize concepts and connections.', icon: '🧠', category: 'reflection', shortLabel: 'MINDMAP' },
  { id: 'visionboard', label: 'Vision Board', summary: 'Visual representation of your dreams.', icon: '🌟', category: 'core', shortLabel: 'VISION' },
  { id: 'decisionlog', label: 'Decision Log', summary: 'Document important choices and outcomes.', icon: '⚖️', category: 'reflection', shortLabel: 'DECISIONS' },
  { id: 'resources', label: 'Resources', summary: 'Links, files, and reference materials.', icon: '📚', category: 'productivity', shortLabel: 'RESOURCES' },
  { id: 'settings', label: 'Settings', summary: 'Customize your experience.', icon: '⚙️', category: 'system', shortLabel: 'SETTINGS' },
];

// Mobile Navigation Configuration
const MOBILE_NAV_SECTIONS = [
  {
    title: 'Core',
    workspaceIds: ['overview', 'goals', 'visionboard'] as WorkspaceId[],
  },
  {
    title: 'Productivity',
    workspaceIds: ['projects', 'tasks', 'calendar', 'notes', 'timetracking', 'resources'] as WorkspaceId[],
  },
  {
    title: 'Personal Growth',
    workspaceIds: ['learning', 'journal', 'body', 'relationships', 'finance'] as WorkspaceId[],
  },
  {
    title: 'Reflection & Planning',
    workspaceIds: ['insights', 'ideas', 'mindmap', 'decisionlog'] as WorkspaceId[],
  },
  {
    title: 'System',
    workspaceIds: ['settings'] as WorkspaceId[],
  },
];

// Mobile Footer Quick Access
const MOBILE_FOOTER_WORKSPACE_IDS: WorkspaceId[] = [
  'overview',
  'goals',
  'tasks',
  'body',
  'insights',
];

// Mock User Session
const createMockSession = (): Session => ({
  user: {
    name: 'Alex Journey',
    email: 'alex@lifegoal.app',
    timezone: 'America/New_York',
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: true,
    },
  },
  isAuthenticated: true,
  startTime: new Date(),
});

// Main App Component
const App: React.FC = () => {
  // State Management
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [session] = useState<Session>(createMockSession);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Responsive Design
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      if (width >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setShowNotifications(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Navigation Handlers
  const handleWorkspaceChange = useCallback((workspaceId: WorkspaceId) => {
    setActiveWorkspace(workspaceId);
    if (isMobile || isTablet) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile, isTablet]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  // Quick Actions
  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'new-task',
      label: 'New Task',
      icon: <Plus size={16} />,
      action: () => {
        setActiveWorkspace('tasks');
        // Trigger task creation modal
      },
      category: 'create',
    },
    {
      id: 'new-project',
      label: 'New Project',
      icon: <Plus size={16} />,
      action: () => {
        setActiveWorkspace('projects');
        // Trigger project creation modal
      },
      category: 'create',
    },
    {
      id: 'new-goal',
      label: 'New Goal',
      icon: <Target size={16} />,
      action: () => {
        setActiveWorkspace('goals');
        // Trigger goal creation modal
      },
      category: 'create',
    },
    {
      id: 'journal-entry',
      label: 'Journal Entry',
      icon: <Book size={16} />,
      action: () => {
        setActiveWorkspace('journal');
        // Trigger journal entry modal
      },
      category: 'create',
    },
    {
      id: 'view-insights',
      label: 'View Insights',
      icon: <TrendingUp size={16} />,
      action: () => setActiveWorkspace('insights'),
      category: 'view',
    },
  ], []);

  // Get active workspace item
  const activeWorkspaceItem = useMemo(
    () => BASE_WORKSPACE_NAV_ITEMS.find(item => item.id === activeWorkspace),
    [activeWorkspace]
  );

  // Filtered workspace items based on search
  const filteredWorkspaceItems = useMemo(() => {
    if (!searchQuery.trim()) return BASE_WORKSPACE_NAV_ITEMS;
    const query = searchQuery.toLowerCase();
    return BASE_WORKSPACE_NAV_ITEMS.filter(
      item =>
        item.label.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Notification Management
  const unreadNotificationCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Mock notification creation (for demo purposes)
  useEffect(() => {
    const demoNotifications: Notification[] = [
      {
        id: '1',
        type: 'info',
        title: 'Welcome to LifeGoal',
        message: 'Your personal life management system is ready.',
        timestamp: new Date(),
        read: false,
      },
      {
        id: '2',
        type: 'success',
        title: 'Goal Progress',
        message: 'You\'ve completed 3 tasks towards your fitness goal!',
        timestamp: new Date(Date.now() - 3600000),
        read: false,
      },
    ];
    setNotifications(demoNotifications);
  }, []);

  // Render Workspace Content
  const renderWorkspaceSection = useCallback((workspaceId: WorkspaceId) => {
    const activeSession = session;

    switch (workspaceId) {
      case 'overview':
        return (
          <div className="workspace-content">
            <OverviewDashboard
              session={activeSession}
              onNavigate={handleWorkspaceChange}
              quickActions={quickActions}
            />
          </div>
        );
      case 'projects':
        return (
          <div className="workspace-content">
            <ProjectsTab session={activeSession} />
          </div>
        );
      case 'tasks':
        return (
          <div className="workspace-content">
            <TasksTab session={activeSession} />
          </div>
        );
      case 'goals':
        return (
          <div className="workspace-content">
            <GoalsTab session={activeSession} />
          </div>
        );
      case 'journal':
        return (
          <div className="workspace-content">
            <JournalTab session={activeSession} />
          </div>
        );
      case 'finance':
        return (
          <div className="workspace-content">
            <FinanceTab session={activeSession} />
          </div>
        );
      case 'learning':
        return (
          <div className="workspace-content">
            <LearningTab session={activeSession} />
          </div>
        );
      case 'relationships':
        return (
          <div className="workspace-content">
            <RelationshipsTab session={activeSession} />
          </div>
        );
      case 'body':
        return (
          <div className="workspace-content">
            <BodyTab session={activeSession} />
          </div>
        );
      case 'insights':
        return (
          <div className="workspace-content">
            <InsightsTab session={activeSession} />
          </div>
        );
      case 'calendar':
        return (
          <div className="workspace-content">
            <CalendarTab session={activeSession} />
          </div>
        );
      case 'notes':
        return (
          <div className="workspace-content">
            <NotesTab session={activeSession} />
          </div>
        );
      case 'timetracking':
        return (
          <div className="workspace-content">
            <TimeTrackingTab session={activeSession} />
          </div>
        );
      case 'ideas':
        return (
          <div className="workspace-content">
            <IdeasTab session={activeSession} />
          </div>
        );
      case 'mindmap':
        return (
          <div className="workspace-content">
            <MindMapTab session={activeSession} />
          </div>
        );
      case 'visionboard':
        return (
          <div className="workspace-content">
            <VisionBoardTab session={activeSession} />
          </div>
        );
      case 'decisionlog':
        return (
          <div className="workspace-content">
            <DecisionLogTab session={activeSession} />
          </div>
        );
      case 'resources':
        return (
          <div className="workspace-content">
            <ResourcesTab session={activeSession} />
          </div>
        );
      case 'settings':
        return (
          <div className="workspace-content">
            <SettingsTab session={activeSession} />
          </div>
        );
      default:
        return (
          <div className="workspace-content">
            <div className="empty-state">
              <AlertCircle size={48} />
              <h3>Workspace Not Found</h3>
              <p>The requested workspace does not exist.</p>
            </div>
          </div>
        );
    }
  }, [session, handleWorkspaceChange, quickActions]);

  // Desktop Sidebar
  const renderDesktopSidebar = () => (
    <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🎯</span>
          {isSidebarOpen && <span className="logo-text">LifeGoal</span>}
        </div>
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isSidebarOpen && (
        <div className="sidebar-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      <nav className="sidebar-nav">
        {filteredWorkspaceItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeWorkspace === item.id ? 'active' : ''}`}
            onClick={() => handleWorkspaceChange(item.id)}
            title={!isSidebarOpen ? item.label : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            {isSidebarOpen && (
              <span className="nav-label">{item.label}</span>
            )}
          </button>
        ))}
      </nav>

      {isSidebarOpen && (
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {session.user.name.charAt(0)}
            </div>
            <div className="user-info">
              <div className="user-name">{session.user.name}</div>
              <div className="user-email">{session.user.email}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );

  // Mobile Navigation
  const renderMobileNav = () => (
    <>
      <header className="mobile-header">
        <button className="mobile-menu-button" onClick={toggleMobileMenu}>
          <Menu size={24} />
        </button>
        <div className="mobile-logo">
          <span className="logo-icon">🎯</span>
          <span className="logo-text">LifeGoal</span>
        </div>
        <button
          className="mobile-notifications-button"
          onClick={() => setShowNotifications(true)}
        >
          <Bell size={24} />
          {unreadNotificationCount > 0 && (
            <span className="notification-badge">{unreadNotificationCount}</span>
          )}
        </button>
      </header>

      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={toggleMobileMenu}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <h2>Navigation</h2>
              <button onClick={toggleMobileMenu}>
                <X size={24} />
              </button>
            </div>
            <div className="mobile-menu-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="mobile-menu-content">
              {MOBILE_NAV_SECTIONS.map(section => (
                <div key={section.title} className="mobile-nav-section">
                  <h3 className="section-title">{section.title}</h3>
                  <div className="section-items">
                    {section.workspaceIds
                      .map(id => BASE_WORKSPACE_NAV_ITEMS.find(item => item.id === id))
                      .filter(Boolean)
                      .map(item => item!)
                      .map(item => (
                        <button
                          key={item.id}
                          className={`mobile-nav-item ${activeWorkspace === item.id ? 'active' : ''}`}
                          onClick={() => handleWorkspaceChange(item.id)}
                        >
                          <span className="item-icon">{item.icon}</span>
                          <div className="item-content">
                            <span className="item-label">{item.label}</span>
                            <span className="item-summary">{item.summary}</span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mobile-menu-footer">
              <div className="user-profile">
                <div className="user-avatar">
                  {session.user.name.charAt(0)}
                </div>
                <div className="user-info">
                  <div className="user-name">{session.user.name}</div>
                  <div className="user-email">{session.user.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-footer-nav">
        {MOBILE_FOOTER_WORKSPACE_IDS.map(id => {
          const item = BASE_WORKSPACE_NAV_ITEMS.find(i => i.id === id);
          if (!item) return null;
          return (
            <button
              key={item.id}
              className={`footer-nav-item ${activeWorkspace === item.id ? 'active' : ''}`}
              onClick={() => handleWorkspaceChange(item.id)}
            >
              <span className="item-icon">{item.icon}</span>
              <span className="item-label">{item.shortLabel || item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );

  // Notifications Panel
  const renderNotificationsPanel = () => (
    <div className={`notifications-panel ${showNotifications ? 'open' : ''}`}>
      <div className="notifications-header">
        <h3>Notifications</h3>
        <div className="notifications-actions">
          {notifications.length > 0 && (
            <button onClick={clearAllNotifications} className="btn-text">
              Clear All
            </button>
          )}
          <button onClick={() => setShowNotifications(false)}>
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="notifications-content">
        {notifications.length === 0 ? (
          <div className="empty-notifications">
            <Bell size={48} />
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-item ${notification.type} ${notification.read ? 'read' : 'unread'}`}
              onClick={() => markNotificationAsRead(notification.id)}
            >
              <div className="notification-icon">
                {notification.type === 'success' && <Check size={20} />}
                {notification.type === 'error' && <AlertCircle size={20} />}
                {notification.type === 'warning' && <AlertTriangle size={20} />}
                {notification.type === 'info' && <Info size={20} />}
              </div>
              <div className="notification-content">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-message">{notification.message}</div>
                <div className="notification-time">
                  {notification.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Command Palette
  const renderCommandPalette = () => (
    <div className={`command-palette-overlay ${isCommandPaletteOpen ? 'open' : ''}`} onClick={() => setIsCommandPaletteOpen(false)}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-search">
          <Search size={20} />
          <input
            type="text"
            placeholder="Type a command or search..."
            autoFocus
          />
        </div>
        <div className="command-palette-results">
          <div className="results-section">
            <div className="section-title">Quick Actions</div>
            {quickActions.map(action => (
              <button
                key={action.id}
                className="result-item"
                onClick={() => {
                  action.action();
                  setIsCommandPaletteOpen(false);
                }}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
          <div className="results-section">
            <div className="section-title">Workspaces</div>
            {BASE_WORKSPACE_NAV_ITEMS.slice(0, 5).map(item => (
              <button
                key={item.id}
                className="result-item"
                onClick={() => {
                  handleWorkspaceChange(item.id);
                  setIsCommandPaletteOpen(false);
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Main Render
  return (
    <div className={`app ${isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'}`}>
      {!isMobile && renderDesktopSidebar()}
      {isMobile && renderMobileNav()}

      <main className="main-content">
        {!isMobile && (
          <header className="content-header">
            <div className="header-left">
              <h1 className="workspace-title">
                <span className="title-icon">{activeWorkspaceItem?.icon}</span>
                {activeWorkspaceItem?.label}
              </h1>
              <p className="workspace-summary">{activeWorkspaceItem?.summary}</p>
            </div>
            <div className="header-right">
              <button
                className="btn-icon"
                onClick={() => setIsCommandPaletteOpen(true)}
                title="Command Palette (Ctrl+K)"
              >
                <Search size={20} />
              </button>
              <button
                className="btn-icon notifications-button"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
                {unreadNotificationCount > 0 && (
                  <span className="notification-badge">{unreadNotificationCount}</span>
                )}
              </button>
              <div className="user-menu">
                <button className="user-menu-trigger">
                  <div className="user-avatar-small">
                    {session.user.name.charAt(0)}
                  </div>
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>
          </header>
        )}

        <div className="workspace-container">
          {renderWorkspaceSection(activeWorkspace)}
        </div>
      </main>

      {renderNotificationsPanel()}
      {renderCommandPalette()}
    </div>
  );
};

// Overview Dashboard Component
const OverviewDashboard: React.FC<{
  session: Session;
  onNavigate: (workspace: WorkspaceId) => void;
  quickActions: QuickAction[];
}> = ({ session, onNavigate, quickActions }) => {
  return (
    <div className="overview-dashboard">
      <div className="welcome-section">
        <h2>Welcome back, {session.user.name.split(' ')[0]}! 👋</h2>
        <p>Here's what's happening in your life today.</p>
      </div>

      <div className="quick-actions-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions-grid">
          {quickActions.map(action => (
            <button
              key={action.id}
              className="quick-action-card"
              onClick={action.action}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card tasks-summary">
          <div className="card-header">
            <h3>Today's Tasks</h3>
            <CheckSquare size={20} />
          </div>
          <div className="card-content">
            <div className="stat-large">5</div>
            <p>tasks pending</p>
            <button className="btn-link" onClick={() => onNavigate('tasks')}>
              View all tasks →
            </button>
          </div>
        </div>

        <div className="dashboard-card goals-summary">
          <div className="card-header">
            <h3>Active Goals</h3>
            <Target size={20} />
          </div>
          <div className="card-content">
            <div className="stat-large">3</div>
            <p>goals in progress</p>
            <button className="btn-link" onClick={() => onNavigate('goals')}>
              View all goals →
            </button>
          </div>
        </div>

        <div className="dashboard-card projects-summary">
          <div className="card-header">
            <h3>Projects</h3>
            <Layers size={20} />
          </div>
          <div className="card-content">
            <div className="stat-large">7</div>
            <p>active projects</p>
            <button className="btn-link" onClick={() => onNavigate('projects')}>
              View all projects →
            </button>
          </div>
        </div>

        <div className="dashboard-card insights-summary">
          <div className="card-header">
            <h3>This Week</h3>
            <TrendingUp size={20} />
          </div>
          <div className="card-content">
            <div className="stat-row">
              <span>Tasks completed:</span>
              <strong>12</strong>
            </div>
            <div className="stat-row">
              <span>Hours tracked:</span>
              <strong>24.5</strong>
            </div>
            <button className="btn-link" onClick={() => onNavigate('insights')}>
              View insights →
            </button>
          </div>
        </div>
      </div>

      <div className="recent-activity-section">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-icon">✅</div>
            <div className="activity-content">
              <p><strong>Completed task:</strong> Review project proposal</p>
              <span className="activity-time">2 hours ago</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon">📖</div>
            <div className="activity-content">
              <p><strong>New journal entry:</strong> Daily reflection</p>
              <span className="activity-time">5 hours ago</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon">🎯</div>
            <div className="activity-content">
              <p><strong>Goal progress:</strong> Fitness goal 60% complete</p>
              <span className="activity-time">1 day ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;