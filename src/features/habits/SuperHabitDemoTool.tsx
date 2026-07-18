import { useEffect, useState } from 'react';
import type { SuperHabitDefinition } from './superHabits';
const STORAGE_PREFIX = 'lifegoal:superhabit:demo-session:';
export function SuperHabitDemoTool({ superHabit }: { superHabit: SuperHabitDefinition }) {
  const steps = superHabit.tools.slice(0, 3);
  const [done, setDone] = useState<string[]>(() => { if (typeof window === 'undefined') return []; try { return JSON.parse(window.localStorage.getItem(`${STORAGE_PREFIX}${superHabit.id}`) ?? '[]'); } catch { return []; } });
  useEffect(() => { window.localStorage.setItem(`${STORAGE_PREFIX}${superHabit.id}`, JSON.stringify(done)); }, [done, superHabit.id]);
  return <div className="super-habit-roster__guided-demo"><small>Interactive Pro demo</small><strong>{superHabit.promise}</strong>{steps.map((step, index) => <button key={step} type="button" className={done.includes(step) ? 'is-done' : ''} onClick={() => setDone((current) => current.includes(step) ? current.filter((item) => item !== step) : [...current, step])}><span>{done.includes(step) ? '✓' : index + 1}</span><b>{step}</b></button>)}<p>{done.length === steps.length ? 'Demo path complete. In Pro, a verified tool result can complete the linked habit.' : 'Try the path. Demo progress stays on this device and never marks a habit done.'}</p></div>;
}
