import './habits.css';

/**
 * Habits & Routines - Responsive Presentational Component
 * 
 * This component demonstrates the responsive layout fixes for the Habits & Routines screen.
 * It's designed as a presentational POC that maintainers can integrate into the existing page.
 * 
 * Key responsive fixes implemented:
 * - min-width: 0 on flex children to allow shrinking
 * - overflow-wrap/word-break on text elements
 * - flex-wrap on control rows for button stacking
 * - safe-area insets for notch devices
 * - Media queries for very small screens
 * 
 * Usage:
 * ```tsx
 * import { Habits } from './components/Habits';
 * 
 * function App() {
 *   return <Habits />;
 * }
 * ```
 */

interface HabitData {
  id: string;
  title: string;
  description: string;
  streak: number;
  completedToday: boolean;
  frequency: string;
  progress: number;
}

interface NavItem {
  id: string;
  icon: string;
  label: string;
  active?: boolean;
}

// Sample data for demonstration
const sampleHabits: HabitData[] = [
  {
    id: '1',
    title: 'Morning Meditation Practice',
    description: 'Start the day with 10 minutes of mindfulness meditation',
    streak: 7,
    completedToday: true,
    frequency: 'Daily',
    progress: 85,
  },
  {
    id: '2',
    title: 'Exercise and Physical Activity Routine',
    description: 'Complete at least 30 minutes of exercise or physical activity',
    streak: 3,
    completedToday: false,
    frequency: 'Daily',
    progress: 60,
  },
  {
    id: '3',
    title: 'Read and Learn Something New Every Day',
    description: 'Read at least 20 pages or spend 30 minutes learning',
    streak: 14,
    completedToday: true,
    frequency: 'Daily',
    progress: 92,
  },
];

const navItems: NavItem[] = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'goals', icon: '🎯', label: 'Goals' },
  { id: 'habits', icon: '📋', label: 'Habits', active: true },
  { id: 'journal', icon: '📝', label: 'Journal' },
  { id: 'profile', icon: '👤', label: 'Profile' },
];

// Generate week days for streak display
const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const today = new Date().getDay();

interface HabitCardProps {
  habit: HabitData;
  onToggle?: (id: string) => void;
  onEdit?: (id: string) => void;
}

function HabitCard({ habit, onToggle, onEdit }: HabitCardProps) {
  return (
    <article className="habit-card">
      <div className="card-content">
        <h3>{habit.title}</h3>
        <p>{habit.description}</p>
        
        <div className="card-tracker">
          <span className="tracker-pill">
            🔥 {habit.streak} day streak
          </span>
          <span className="tracker-pill">
            📅 {habit.frequency}
          </span>
        </div>

        <div className="progress-bar">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${habit.progress}%` }}
            role="progressbar"
            aria-valuenow={habit.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        <div className="streak-display">
          {weekDays.map((day, index) => (
            <span 
              key={index}
              className={`streak-day${index < today ? ' completed' : ''}${index === today ? ' today' : ''}`}
              aria-label={`${day}${index === today ? ' (today)' : ''}`}
            >
              {day}
            </span>
          ))}
        </div>
      </div>

      <div className="habit-controls">
        <button 
          className={`habit-btn${habit.completedToday ? ' habit-btn--secondary' : ''}`}
          onClick={() => onToggle?.(habit.id)}
          aria-pressed={habit.completedToday}
        >
          {habit.completedToday ? '✓ Completed' : 'Mark Complete'}
        </button>
        <button 
          className="habit-btn habit-btn--ghost"
          onClick={() => onEdit?.(habit.id)}
        >
          Edit
        </button>
      </div>
    </article>
  );
}

interface NavButtonProps {
  item: NavItem;
  onClick?: (id: string) => void;
}

function NavButton({ item, onClick }: NavButtonProps) {
  return (
    <button 
      className={`nav-btn${item.active ? ' active' : ''}`}
      onClick={() => onClick?.(item.id)}
      aria-current={item.active ? 'page' : undefined}
    >
      <span className="nav-btn-icon" aria-hidden="true">{item.icon}</span>
      <span className="nav-btn-label">{item.label}</span>
    </button>
  );
}

export interface HabitsProps {
  /** Optional class name for styling */
  className?: string;
  /** Optional callback when a habit is toggled */
  onToggleHabit?: (id: string) => void;
  /** Optional callback when a habit is edited */
  onEditHabit?: (id: string) => void;
  /** Optional callback for navigation */
  onNavigate?: (id: string) => void;
}

/**
 * Habits & Routines Screen Component
 * 
 * A presentational component demonstrating responsive layout fixes
 * for small screens and notch devices.
 */
export function Habits({ 
  className = '', 
  onToggleHabit, 
  onEditHabit,
  onNavigate 
}: HabitsProps) {
  return (
    <div className={`habits-container ${className}`.trim()}>
      <header className="habits-header">
        <h1>Habits &amp; Routines</h1>
        <p>Build consistent daily habits to achieve your goals</p>
      </header>

      <main className="habits-content">
        <div className="section-header">
          <h2 className="section-title">Today&apos;s Habits</h2>
          <button className="section-action">+ Add Habit</button>
        </div>

        {sampleHabits.map((habit) => (
          <HabitCard 
            key={habit.id} 
            habit={habit}
            onToggle={onToggleHabit}
            onEdit={onEditHabit}
          />
        ))}
      </main>

      <nav className="habits-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavButton 
            key={item.id} 
            item={item}
            onClick={onNavigate}
          />
        ))}
      </nav>
    </div>
  );
}

export default Habits;
