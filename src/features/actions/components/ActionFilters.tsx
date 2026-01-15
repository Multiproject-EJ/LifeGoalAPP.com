import type { Action } from '../../../types/actions';
import { calculateTimeRemaining } from '../../../types/actions';
import './ActionFilters.css';

export type FilterOption = 'all' | 'expiring_soon' | 'today' | 'this_week';

// Constants
const EXPIRING_SOON_THRESHOLD_HOURS = 24;

// Helper function to check if MUST DO items should always show
const shouldAlwaysShow = (action: Action): boolean => {
  return action.category === 'must_do';
};

export interface ActionFiltersProps {
  actions: Action[];
  activeFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
}

export function ActionFilters({ actions, activeFilter, onFilterChange }: ActionFiltersProps) {
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  // Calculate counts for each filter
  const counts = {
    all: actions.filter((a) => !a.completed).length,
    expiring_soon: actions.filter((a) => {
      if (a.completed || shouldAlwaysShow(a)) return false;
      const timeRemaining = calculateTimeRemaining(a.expires_at);
      return timeRemaining.hoursRemaining + timeRemaining.daysRemaining * 24 < EXPIRING_SOON_THRESHOLD_HOURS;
    }).length,
    today: actions.filter((a) => {
      if (a.completed) return false;
      if (shouldAlwaysShow(a)) return true;
      const expires = new Date(a.expires_at);
      return expires <= todayEnd;
    }).length,
    this_week: actions.filter((a) => {
      if (a.completed) return false;
      if (shouldAlwaysShow(a)) return true;
      const expires = new Date(a.expires_at);
      return expires <= weekEnd;
    }).length,
  };

  const filters: Array<{ key: FilterOption; label: string; icon?: string }> = [
    { key: 'all', label: 'All' },
    { key: 'expiring_soon', label: 'Expiring Soon', icon: '⚠️' },
    { key: 'today', label: 'Today' },
    { key: 'this_week', label: 'This Week' },
  ];

  return (
    <div className="action-filters" role="tablist" aria-label="Action filters">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.key;
        const count = counts[filter.key];

        return (
          <button
            key={filter.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`action-filters__button ${
              isActive ? 'action-filters__button--active' : ''
            }`}
            onClick={() => onFilterChange(filter.key)}
          >
            <span className="action-filters__label">
              {filter.icon && <span aria-hidden="true">{filter.icon} </span>}
              {filter.label}
            </span>
            <span className="action-filters__badge">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
