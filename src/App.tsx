import { useState, useEffect } from 'react';
import { useSupabaseAuth } from './features/auth/SupabaseAuthProvider';
import { ProgressDashboard } from './features/dashboard';
import { GoalWorkspace } from './features/goals';
import { HabitsModule } from './features/habits';
import { BodyTab } from './features/body';
import { Journal } from './features/journal';
import { VisionBoard } from './features/vision-board';
import { LifeWheelCheckins } from './features/checkins';
import { AiCoach } from './features/ai-coach';
import { ReviewWizard } from './features/annual-review';
import './index.css';

type TabId = 
  | 'dashboard' 
  | 'goals' 
  | 'habits' 
  | 'body' 
  | 'journal' 
  | 'vision-board' 
  | 'checkins' 
  | 'ai-coach' 
  | 'annual-review';

interface TabConfig {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'goals', label: 'Goals', icon: '🎯' },
  { id: 'habits', label: 'Habits', icon: '✅' },
  { id: 'body', label: 'Body', icon: '💪' },
  { id: 'journal', label: 'Journal', icon: '📖' },
  { id: 'vision-board', label: 'Vision Board', icon: '🌟' },
  { id: 'checkins', label: 'Life Wheel', icon: '🎡' },
  { id: 'ai-coach', label: 'AI Coach', icon: '🤖' },
  { id: 'annual-review', label: 'Annual Review', icon: '📅' },
];

function App() {
  const { session, initializing } = useSupabaseAuth();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (initializing) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-error">
        <h1>Authentication Required</h1>
        <p>Please sign in to continue.</p>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ProgressDashboard session={session} />;
      case 'goals':
        return <GoalWorkspace session={session} />;
      case 'habits':
        return <HabitsModule session={session} />;
      case 'body':
        return <BodyTab session={session} />;
      case 'journal':
        return <Journal session={session} />;
      case 'vision-board':
        return <VisionBoard session={session} />;
      case 'checkins':
        return <LifeWheelCheckins session={session} />;
      case 'ai-coach':
        return <AiCoach session={session} onClose={() => setActiveTab('dashboard')} />;
      case 'annual-review':
        return <ReviewWizard />;
      default:
        return <ProgressDashboard session={session} />;
    }
  };

  return (
    <div className={`app ${isMobile ? 'mobile' : 'desktop'}`}>
      <nav className="app-nav">
        <div className="nav-header">
          <h1 className="app-title">🎯 LifeGoal</h1>
        </div>
        <div className="nav-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {!isMobile && <span className="tab-label">{tab.label}</span>}
            </button>
          ))}
        </div>
      </nav>
      <main className="app-content">
        {renderTabContent()}
      </main>
    </div>
  );
}

export default App;
