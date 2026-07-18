import { useEffect, useMemo, useState } from 'react';

type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner' | 'Feast';
type Recipe = { id: string; name: string; slot: MealSlot; minutes: number; effort: 'easy' | 'medium'; tags: string[] };
type MealPlan = Partial<Record<MealSlot, string>>;

const RECIPES: Recipe[] = [
  { id: 'oats', name: 'Berry overnight oats', slot: 'Breakfast', minutes: 5, effort: 'easy', tags: ['vegetarian', 'prep-ahead', 'filling'] },
  { id: 'eggs', name: 'Soft eggs & seeded toast', slot: 'Breakfast', minutes: 10, effort: 'easy', tags: ['high-protein', 'warm', 'familiar'] },
  { id: 'yogurt', name: 'Crunchy yogurt bowl', slot: 'Breakfast', minutes: 4, effort: 'easy', tags: ['vegetarian', 'quick', 'fresh'] },
  { id: 'smoothie', name: 'Peanut berry smoothie', slot: 'Breakfast', minutes: 6, effort: 'easy', tags: ['portable', 'quick', 'energy'] },
  { id: 'beans', name: 'Breakfast beans & avocado', slot: 'Breakfast', minutes: 12, effort: 'medium', tags: ['vegan', 'filling', 'fibre'] },
  { id: 'wrap', name: 'Rainbow hummus wrap', slot: 'Lunch', minutes: 8, effort: 'easy', tags: ['vegan', 'portable', 'crunchy'] },
  { id: 'soup', name: 'Tomato lentil soup', slot: 'Lunch', minutes: 15, effort: 'easy', tags: ['vegan', 'warm', 'prep-ahead'] },
  { id: 'tuna', name: 'Herby tuna grain bowl', slot: 'Lunch', minutes: 12, effort: 'easy', tags: ['high-protein', 'portable', 'fresh'] },
  { id: 'quesadilla', name: 'Bean & corn quesadilla', slot: 'Lunch', minutes: 14, effort: 'medium', tags: ['vegetarian', 'familiar', 'warm'] },
  { id: 'leftovers', name: 'Clever leftovers plate', slot: 'Lunch', minutes: 5, effort: 'easy', tags: ['low-waste', 'quick', 'flexible'] },
  { id: 'salmon', name: 'Miso salmon tray bake', slot: 'Dinner', minutes: 28, effort: 'medium', tags: ['high-protein', 'one-pan', 'colourful'] },
  { id: 'pasta', name: 'Green pesto bean pasta', slot: 'Dinner', minutes: 18, effort: 'easy', tags: ['vegetarian', 'familiar', 'comfort'] },
  { id: 'curry', name: 'Coconut chickpea curry', slot: 'Dinner', minutes: 25, effort: 'medium', tags: ['vegan', 'prep-ahead', 'warm'] },
  { id: 'tacos', name: 'Build-your-own fish tacos', slot: 'Dinner', minutes: 22, effort: 'medium', tags: ['social', 'colourful', 'fresh'] },
  { id: 'stirfry', name: 'Ginger tofu stir-fry', slot: 'Dinner', minutes: 17, effort: 'easy', tags: ['vegan', 'quick', 'crunchy'] },
  { id: 'feast', name: 'Sunday sharing roast', slot: 'Feast', minutes: 70, effort: 'medium', tags: ['social', 'celebration', 'comfort'] },
  { id: 'mezze', name: 'Colourful mezze table', slot: 'Feast', minutes: 35, effort: 'medium', tags: ['social', 'vegetarian', 'variety'] },
];
const STORAGE_KEY = 'lifegoal:superhabit:eat-well-demo:v1';
const SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Feast'];

function loadState(): { plan: MealPlan; library: string[]; preferences: string[] } {
  if (typeof window === 'undefined') return { plan: {}, library: [], preferences: [] };
  try { const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}'); return { plan: value.plan ?? {}, library: value.library ?? [], preferences: value.preferences ?? [] }; }
  catch { return { plan: {}, library: [], preferences: [] }; }
}

export function EatWellDemo() {
  const initial = useMemo(loadState, []);
  const [slot, setSlot] = useState<MealSlot>('Breakfast');
  const [plan, setPlan] = useState<MealPlan>(initial.plan);
  const [library, setLibrary] = useState<string[]>(initial.library);
  const [preferences, setPreferences] = useState<string[]>(initial.preferences);
  const [effort, setEffort] = useState<'any' | 'easy'>('any');
  const recipes = RECIPES.filter((recipe) => recipe.slot === slot && (effort === 'any' || recipe.effort === effort));
  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ plan, library, preferences })); }, [library, plan, preferences]);
  const togglePreference = (value: string) => setPreferences((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  return <div className="eat-well-demo">
    <div className="eat-well-demo__heading"><div><small>Interactive Pro demo</small><strong>My Meal Plan</strong></div><span>Saved on this device</span></div>
    <div className="eat-well-demo__question"><p>What should your food make easier this week?</p>{['More energy', 'Get in shape', 'Less effort', 'Eat together'].map((item) => <button key={item} type="button" className={preferences.includes(item) ? 'is-on' : ''} onClick={() => togglePreference(item)}>{item}</button>)}</div>
    <div className="eat-well-demo__slots">{SLOTS.map((item) => <button key={item} type="button" className={slot === item ? 'is-active' : ''} onClick={() => setSlot(item)}><span>{item === 'Feast' ? '✨' : item === 'Breakfast' ? '☀️' : item === 'Lunch' ? '🥗' : '🌙'}</span><b>{item}</b><small>{plan[item] ? RECIPES.find((recipe) => recipe.id === plan[item])?.name : 'Choose'}</small></button>)}</div>
    <div className="eat-well-demo__filter"><strong>{slot} alternatives</strong><button type="button" onClick={() => setEffort(effort === 'any' ? 'easy' : 'any')}>{effort === 'easy' ? 'Easy only ✓' : 'Any effort'}</button></div>
    <div className="eat-well-demo__recipes">{recipes.map((recipe) => <article key={recipe.id} className={plan[slot] === recipe.id ? 'is-picked' : ''}><button type="button" className="eat-well-demo__pick" onClick={() => setPlan((current) => ({ ...current, [slot]: recipe.id }))}><strong>{recipe.name}</strong><span>{recipe.minutes} min · {recipe.effort}</span><small>{recipe.tags.join(' · ')}</small></button><button type="button" className="eat-well-demo__save" aria-label={`${library.includes(recipe.id) ? 'Remove' : 'Add'} ${recipe.name} ${library.includes(recipe.id) ? 'from' : 'to'} recipe library`} onClick={() => setLibrary((current) => current.includes(recipe.id) ? current.filter((id) => id !== recipe.id) : [...current, recipe.id])}>{library.includes(recipe.id) ? '★' : '☆'}</button></article>)}</div>
    <p className="eat-well-demo__library">Recipe library: <strong>{library.length}</strong> saved · Meal choices remain a demo and do not complete a habit.</p>
  </div>;
}
