export const ISLAND_RUN_LIFE_WHEEL_AREAS = [
  'Health',
  'Mind',
  'Work',
  'Money',
  'Relationships',
  'Home',
  'Growth',
  'Fun',
] as const;

export type IslandRunLifeWheelArea = typeof ISLAND_RUN_LIFE_WHEEL_AREAS[number];

export const ISLAND_RUN_HABIT_TIMING_CHOICES = ['Morning', 'Afternoon', 'Evening', 'Anytime'] as const;
export type IslandRunHabitTimingChoice = typeof ISLAND_RUN_HABIT_TIMING_CHOICES[number];

const AREA_PRESETS: Record<IslandRunLifeWheelArea, readonly string[]> = {
  Health: ['Drink one glass of water', 'Stretch for 5 minutes', 'Take a 10-minute walk'],
  Mind: ['Do 3 mindful breaths', 'Write one gratitude line', 'Read 2 pages of a book'],
  Work: ['Plan top 1 priority', 'Do a 10-minute deep work sprint', 'Clear one inbox task'],
  Money: ['Check account balances', 'Log one expense', 'Transfer $5 to savings'],
  Relationships: ['Send one caring message', 'Give one appreciation', 'Plan one short check-in call'],
  Home: ['Reset one small space', 'Do dishes for 5 minutes', 'Tidy one surface'],
  Growth: ['Watch one learning clip', 'Practice one skill for 10 minutes', 'Write one lesson learned'],
  Fun: ['Do one joyful mini-break', 'Listen to one favorite song', 'Step outside for fresh air'],
};

export function getHabitPresetsForArea(area: IslandRunLifeWheelArea): readonly string[] {
  return AREA_PRESETS[area];
}

export function buildIslandRunHabitTitle(input: {
  area: IslandRunLifeWheelArea;
  preset: string;
  timing: IslandRunHabitTimingChoice;
}): string {
  const timingSuffix = input.timing === 'Anytime' ? '' : ` (${input.timing.toLowerCase()})`;
  return `${input.preset}${timingSuffix}`;
}
