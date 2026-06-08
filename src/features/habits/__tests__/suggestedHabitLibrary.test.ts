import {
  getAllSuggestedHabits,
  getStarterHabitForArea,
  getSuggestedHabitById,
  getSuggestedHabitsByGoalIntent,
  getSuggestedHabitsByLifeWheelArea,
  type SuggestedHabitLifeWheelArea,
} from '../suggestedHabitLibrary';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function runAllSuggestedHabitLibraryTests(): void {
  const areas: SuggestedHabitLifeWheelArea[] = ['Health', 'Mind', 'Work', 'Money', 'Love', 'Connections', 'Home', 'Fun'];
  const habits = getAllSuggestedHabits();

  for (const area of areas) {
    const areaHabits = getSuggestedHabitsByLifeWheelArea(area);
    assert(areaHabits.length >= 3, `expected at least 3 habits for ${area}`);
  }

  const byId = getSuggestedHabitById('health-water-glass');
  assert(Boolean(byId), 'expected health-water-glass to exist');
  assert(byId?.title === 'Drink one glass of water', 'lookup by id should return expected habit');

  const workHabits = getSuggestedHabitsByLifeWheelArea('Work');
  assert(workHabits.length >= 3, 'expected 3+ work habits');
  assert(workHabits.every((habit) => habit.lifeWheelArea === 'Work'), 'all filtered work habits should have Work area');

  const focusHabits = getSuggestedHabitsByGoalIntent('focus');
  assert(focusHabits.length > 0, 'expected focus tag filter to return habits');
  assert(focusHabits.every((habit) => habit.goalIntentTags.includes('focus')), 'goal intent filter should return matching habits only');

  const starterOne = getStarterHabitForArea('Mind');
  const starterTwo = getStarterHabitForArea('Mind');
  assert(starterOne.suggestedHabitId === starterTwo.suggestedHabitId, 'starter habit should be deterministic');

  for (const habit of habits) {
    assert(habit.tinyVersion.length > 0, `habit ${habit.suggestedHabitId} missing tinyVersion`);
    assert(habit.normalVersion.length > 0, `habit ${habit.suggestedHabitId} missing normalVersion`);
    assert(habit.stretchVersion.length > 0, `habit ${habit.suggestedHabitId} missing stretchVersion`);
    assert(habit.cueSuggestions.length > 0, `habit ${habit.suggestedHabitId} requires at least one cue`);
    assert(habit.environmentHacks.length > 0, `habit ${habit.suggestedHabitId} requires at least one environment hack`);
  }
}
