import { LIFE_WHEEL_AREAS, type LifeWheelArea } from '../life-wheel/lifeWheelTaxonomy';

/**
 * Suggested-habit areas are the canonical life-wheel areas (see
 * lifeWheelTaxonomy.ts), so each habit maps 1:1 to a check-in category.
 */
export type SuggestedHabitLifeWheelArea = LifeWheelArea;

export type SuggestedHabitDifficultyTier = 'tiny' | 'easy' | 'medium';

export type SuggestedHabitDefaultTiming = 'morning' | 'afternoon' | 'evening' | 'anytime';

export type SuggestedHabit = {
  suggestedHabitId: string;
  title: string;
  lifeWheelArea: SuggestedHabitLifeWheelArea;
  goalIntentTags: string[];
  difficultyTier: SuggestedHabitDifficultyTier;
  tinyVersion: string;
  normalVersion: string;
  stretchVersion: string;
  cueSuggestions: string[];
  environmentHacks: string[];
  blockerTags: string[];
  defaultTiming: SuggestedHabitDefaultTiming;
  emoji: string;
};

const SUGGESTED_HABITS: readonly SuggestedHabit[] = [
  { suggestedHabitId: 'health-water-glass', title: 'Drink one glass of water', lifeWheelArea: 'Health', goalIntentTags: ['energy', 'hydration'], difficultyTier: 'tiny', tinyVersion: 'Drink 4 sips of water.', normalVersion: 'Drink one full glass of water.', stretchVersion: 'Drink two full glasses of water.', cueSuggestions: ['After you wake up', 'Before your first coffee'], environmentHacks: ['Keep a filled bottle by your bed', 'Put a glass beside the sink'], blockerTags: ['forgetting', 'low-energy'], defaultTiming: 'morning', emoji: '💧' },
  { suggestedHabitId: 'health-5-min-walk', title: 'Walk for 5 minutes', lifeWheelArea: 'Health', goalIntentTags: ['movement', 'energy'], difficultyTier: 'easy', tinyVersion: 'Walk for 2 minutes.', normalVersion: 'Walk for 5 minutes.', stretchVersion: 'Walk for 10 minutes.', cueSuggestions: ['Right after lunch', 'After a work block'], environmentHacks: ['Keep shoes near the door', 'Set a 5-minute timer'], blockerTags: ['bad-weather', 'time-crunch'], defaultTiming: 'afternoon', emoji: '🚶' },
  { suggestedHabitId: 'health-2-min-stretch', title: 'Stretch for 2 minutes', lifeWheelArea: 'Health', goalIntentTags: ['mobility', 'stress-relief'], difficultyTier: 'tiny', tinyVersion: 'Do one gentle stretch for 30 seconds.', normalVersion: 'Stretch for 2 minutes.', stretchVersion: 'Stretch for 5 minutes.', cueSuggestions: ['After sitting 60+ minutes'], environmentHacks: ['Leave a yoga mat visible'], blockerTags: ['stiffness', 'forgetting'], defaultTiming: 'anytime', emoji: '🧘' },

  { suggestedHabitId: 'mind-3-breaths', title: 'Take 3 calm breaths', lifeWheelArea: 'Mind', goalIntentTags: ['calm', 'focus'], difficultyTier: 'tiny', tinyVersion: 'Take 1 slow breath.', normalVersion: 'Take 3 calm breaths.', stretchVersion: 'Take 10 calm breaths.', cueSuggestions: ['Before opening messages'], environmentHacks: ['Use a sticky note that says “breathe”'], blockerTags: ['rushing', 'stress'], defaultTiming: 'anytime', emoji: '🌬️' },
  { suggestedHabitId: 'mind-one-sentence', title: 'Write one sentence', lifeWheelArea: 'Mind', goalIntentTags: ['clarity', 'reflection'], difficultyTier: 'tiny', tinyVersion: 'Write 3 words.', normalVersion: 'Write one complete sentence.', stretchVersion: 'Write three sentences.', cueSuggestions: ['Before bed'], environmentHacks: ['Keep a note app pinned'], blockerTags: ['perfectionism', 'mental-fatigue'], defaultTiming: 'evening', emoji: '✍️' },
  { suggestedHabitId: 'mind-1-min-reset', title: 'Do a 1-minute reset', lifeWheelArea: 'Mind', goalIntentTags: ['reset', 'stress-relief'], difficultyTier: 'tiny', tinyVersion: 'Close your eyes for 20 seconds.', normalVersion: 'Take a full 1-minute pause.', stretchVersion: 'Take a 3-minute pause.', cueSuggestions: ['Between tasks'], environmentHacks: ['Set a recurring chime every 2 hours'], blockerTags: ['busy-schedule'], defaultTiming: 'afternoon', emoji: '🧠' },

  { suggestedHabitId: 'work-must-win', title: 'Pick one must-win task', lifeWheelArea: 'Work', goalIntentTags: ['focus', 'productivity'], difficultyTier: 'easy', tinyVersion: 'Name one task out loud.', normalVersion: 'Write one must-win task.', stretchVersion: 'Write one must-win + one backup task.', cueSuggestions: ['Start of work session'], environmentHacks: ['Keep a must-win sticky note on desk'], blockerTags: ['overwhelm', 'distraction'], defaultTiming: 'morning', emoji: '🎯' },
  { suggestedHabitId: 'work-2-min-start', title: 'Start with 2 focused minutes', lifeWheelArea: 'Work', goalIntentTags: ['momentum', 'focus'], difficultyTier: 'tiny', tinyVersion: 'Open the task and work 30 seconds.', normalVersion: 'Work for 2 focused minutes.', stretchVersion: 'Work for 10 focused minutes.', cueSuggestions: ['Before checking email'], environmentHacks: ['Open your task doc before breaks'], blockerTags: ['procrastination'], defaultTiming: 'morning', emoji: '⏱️' },
  { suggestedHabitId: 'work-end-next-step', title: 'Write the next step before stopping', lifeWheelArea: 'Work', goalIntentTags: ['planning', 'consistency'], difficultyTier: 'easy', tinyVersion: 'Write one keyword for next step.', normalVersion: 'Write one clear next step.', stretchVersion: 'Write next step and start time.', cueSuggestions: ['Last 2 minutes of work'], environmentHacks: ['Leave tomorrow task open on screen'], blockerTags: ['fatigue', 'forgetting'], defaultTiming: 'evening', emoji: '➡️' },

  { suggestedHabitId: 'money-check-balance', title: 'Check your main account balance', lifeWheelArea: 'Money', goalIntentTags: ['awareness', 'stability'], difficultyTier: 'tiny', tinyVersion: 'Open your banking app.', normalVersion: 'Check your main account balance.', stretchVersion: 'Check balance and one recent transaction.', cueSuggestions: ['After breakfast'], environmentHacks: ['Place banking app on first screen'], blockerTags: ['avoidance', 'anxiety'], defaultTiming: 'morning', emoji: '💵' },
  { suggestedHabitId: 'money-log-one-spend', title: 'Log one expense', lifeWheelArea: 'Money', goalIntentTags: ['tracking', 'budgeting'], difficultyTier: 'easy', tinyVersion: 'Capture expense amount only.', normalVersion: 'Log one expense with category.', stretchVersion: 'Log three expenses with category.', cueSuggestions: ['After any purchase'], environmentHacks: ['Keep a one-tap expense shortcut'], blockerTags: ['forgetting', 'time-crunch'], defaultTiming: 'anytime', emoji: '🧾' },
  { suggestedHabitId: 'money-transfer-small', title: 'Transfer a small amount to savings', lifeWheelArea: 'Money', goalIntentTags: ['saving', 'future-planning'], difficultyTier: 'easy', tinyVersion: 'Move $1 to savings.', normalVersion: 'Move a small preset amount to savings.', stretchVersion: 'Move twice your preset amount to savings.', cueSuggestions: ['Payday or income day'], environmentHacks: ['Enable automatic transfer template'], blockerTags: ['low-cash', 'inconsistency'], defaultTiming: 'afternoon', emoji: '🏦' },

  { suggestedHabitId: 'relationships-warm-message', title: 'Send one warm message', lifeWheelArea: 'Love', goalIntentTags: ['connection', 'kindness'], difficultyTier: 'tiny', tinyVersion: 'Send one emoji check-in.', normalVersion: 'Send one warm sentence.', stretchVersion: 'Send warm message + one follow-up question.', cueSuggestions: ['During a short break'], environmentHacks: ['Keep a favorites contact list'], blockerTags: ['busyness', 'social-anxiety'], defaultTiming: 'afternoon', emoji: '💌' },
  { suggestedHabitId: 'relationships-one-appreciation', title: 'Share one appreciation', lifeWheelArea: 'Love', goalIntentTags: ['gratitude', 'connection'], difficultyTier: 'easy', tinyVersion: 'Think of one appreciation silently.', normalVersion: 'Share one specific appreciation.', stretchVersion: 'Share appreciation and why it mattered.', cueSuggestions: ['Dinner time'], environmentHacks: ['Capture good moments in notes'], blockerTags: ['awkwardness', 'forgetting'], defaultTiming: 'evening', emoji: '🙏' },
  { suggestedHabitId: 'relationships-pause-breath', title: 'Pause for one breath before reacting', lifeWheelArea: 'Love', goalIntentTags: ['emotional-regulation', 'communication'], difficultyTier: 'tiny', tinyVersion: 'Pause for half a breath.', normalVersion: 'Pause for one full breath.', stretchVersion: 'Pause for three breaths.', cueSuggestions: ['When you feel tension rising'], environmentHacks: ['Set lock screen reminder: “one breath first”'], blockerTags: ['reactivity', 'stress'], defaultTiming: 'anytime', emoji: '🕊️' },

  { suggestedHabitId: 'home-clear-surface', title: 'Clear one small surface', lifeWheelArea: 'Home', goalIntentTags: ['tidy', 'calm-space'], difficultyTier: 'easy', tinyVersion: 'Clear one item.', normalVersion: 'Clear one small surface.', stretchVersion: 'Clear one surface and wipe it down.', cueSuggestions: ['Before bed'], environmentHacks: ['Keep a quick-drop basket nearby'], blockerTags: ['clutter', 'low-energy'], defaultTiming: 'evening', emoji: '🧹' },
  { suggestedHabitId: 'home-2-min-reset', title: 'Do a 2-minute room reset', lifeWheelArea: 'Home', goalIntentTags: ['order', 'momentum'], difficultyTier: 'tiny', tinyVersion: 'Reset for 30 seconds.', normalVersion: 'Reset one room for 2 minutes.', stretchVersion: 'Reset two rooms for 2 minutes each.', cueSuggestions: ['After arriving home'], environmentHacks: ['Use a visible 2-minute timer'], blockerTags: ['fatigue', 'overwhelm'], defaultTiming: 'evening', emoji: '🏠' },
  { suggestedHabitId: 'home-prep-tomorrow-item', title: 'Prep one item for tomorrow', lifeWheelArea: 'Home', goalIntentTags: ['planning', 'smooth-mornings'], difficultyTier: 'tiny', tinyVersion: 'Place one needed item by the door.', normalVersion: 'Prep one item for tomorrow morning.', stretchVersion: 'Prep outfit + one key item.', cueSuggestions: ['Right after dinner'], environmentHacks: ['Create a fixed launch spot'], blockerTags: ['forgetting', 'rushing'], defaultTiming: 'evening', emoji: '🎒' },

  { suggestedHabitId: 'growth-read-one-page', title: 'Read one page', lifeWheelArea: 'Work', goalIntentTags: ['learning', 'self-improvement'], difficultyTier: 'tiny', tinyVersion: 'Read one paragraph.', normalVersion: 'Read one page.', stretchVersion: 'Read five pages and note one idea.', cueSuggestions: ['Before scrolling social media'], environmentHacks: ['Keep book visible on table'], blockerTags: ['distraction', 'time-crunch'], defaultTiming: 'anytime', emoji: '📚' },
  { suggestedHabitId: 'growth-learn-one-note', title: 'Capture one learning note', lifeWheelArea: 'Work', goalIntentTags: ['reflection', 'learning'], difficultyTier: 'tiny', tinyVersion: 'Write one keyword.', normalVersion: 'Write one learning note.', stretchVersion: 'Write one note and one action step.', cueSuggestions: ['After a podcast/video'], environmentHacks: ['Use pinned “learn note” template'], blockerTags: ['forgetting', 'mental-fatigue'], defaultTiming: 'afternoon', emoji: '📝' },
  { suggestedHabitId: 'growth-ask-one-question', title: 'Ask one growth question', lifeWheelArea: 'Work', goalIntentTags: ['curiosity', 'skill-building'], difficultyTier: 'easy', tinyVersion: 'Think of one question.', normalVersion: 'Ask one person or source one question.', stretchVersion: 'Ask one question and summarize the answer.', cueSuggestions: ['During work or study block'], environmentHacks: ['Keep a “questions” running list'], blockerTags: ['self-doubt', 'inertia'], defaultTiming: 'afternoon', emoji: '❓' },

  { suggestedHabitId: 'fun-5-min-play', title: 'Do 5 minutes of playful activity', lifeWheelArea: 'Fun', goalIntentTags: ['joy', 'recovery'], difficultyTier: 'easy', tinyVersion: 'Do 1 minute of play.', normalVersion: 'Do 5 minutes of playful activity.', stretchVersion: 'Do 15 minutes of playful activity.', cueSuggestions: ['After finishing one task'], environmentHacks: ['Keep a short “fun list” ready'], blockerTags: ['guilt', 'busy-schedule'], defaultTiming: 'evening', emoji: '🎉' },
  { suggestedHabitId: 'fun-notice-beauty', title: 'Notice one beautiful thing', lifeWheelArea: 'Fun', goalIntentTags: ['presence', 'joy'], difficultyTier: 'tiny', tinyVersion: 'Pause and notice one color.', normalVersion: 'Notice and name one beautiful thing.', stretchVersion: 'Notice three things and take one photo.', cueSuggestions: ['On a walk or commute'], environmentHacks: ['Use a phone wallpaper reminder'], blockerTags: ['autopilot', 'stress'], defaultTiming: 'anytime', emoji: '✨' },
  { suggestedHabitId: 'fun-micro-creative', title: 'Create something tiny', lifeWheelArea: 'Fun', goalIntentTags: ['creativity', 'self-expression'], difficultyTier: 'tiny', tinyVersion: 'Doodle one line.', normalVersion: 'Create something tiny for 2 minutes.', stretchVersion: 'Create for 10 minutes.', cueSuggestions: ['Before bed wind-down'], environmentHacks: ['Leave one creative tool visible'], blockerTags: ['perfectionism', 'low-energy'], defaultTiming: 'evening', emoji: '🎨' },

  { suggestedHabitId: 'connections-text-friend', title: 'Text a friend you miss', lifeWheelArea: 'Connections', goalIntentTags: ['connection', 'kindness'], difficultyTier: 'tiny', tinyVersion: 'Send one “thinking of you” emoji.', normalVersion: 'Text one friend you miss.', stretchVersion: 'Text a friend and suggest a time to talk.', cueSuggestions: ['During a coffee break'], environmentHacks: ['Pin a “people I miss” note in your phone'], blockerTags: ['busyness', 'social-anxiety'], defaultTiming: 'afternoon', emoji: '📱' },
  { suggestedHabitId: 'connections-call-family', title: 'Check in with family', lifeWheelArea: 'Connections', goalIntentTags: ['connection', 'communication'], difficultyTier: 'easy', tinyVersion: 'Send a family member one quick message.', normalVersion: 'Call or voice-note one family member.', stretchVersion: 'Have a 10-minute catch-up call with family.', cueSuggestions: ['After dinner'], environmentHacks: ['Keep favourite family contacts at the top'], blockerTags: ['forgetting', 'time-crunch'], defaultTiming: 'evening', emoji: '📞' },
  { suggestedHabitId: 'connections-plan-meetup', title: 'Plan one small meetup', lifeWheelArea: 'Connections', goalIntentTags: ['connection', 'kindness'], difficultyTier: 'easy', tinyVersion: 'Suggest one date to meet.', normalVersion: 'Plan one small meetup with a friend.', stretchVersion: 'Plan a meetup and send a calendar invite.', cueSuggestions: ['On a weekend morning'], environmentHacks: ['Keep a short list of low-effort meetup ideas'], blockerTags: ['scheduling', 'inertia'], defaultTiming: 'anytime', emoji: '🧑‍🤝‍🧑' },
];

const STARTER_HABIT_BY_AREA: Record<SuggestedHabitLifeWheelArea, SuggestedHabit> = LIFE_WHEEL_AREAS.reduce(
  (acc, area) => {
    const first = SUGGESTED_HABITS.find((habit) => habit.lifeWheelArea === area);
    if (first) {
      acc[area] = first;
    }
    return acc;
  },
  {} as Record<SuggestedHabitLifeWheelArea, SuggestedHabit>,
);

export function getAllSuggestedHabits(): SuggestedHabit[] {
  return [...SUGGESTED_HABITS];
}

export function getSuggestedHabitsByLifeWheelArea(area: SuggestedHabitLifeWheelArea): SuggestedHabit[] {
  return SUGGESTED_HABITS.filter((habit) => habit.lifeWheelArea === area);
}

export function getSuggestedHabitsByGoalIntent(intentTag: string): SuggestedHabit[] {
  return SUGGESTED_HABITS.filter((habit) => habit.goalIntentTags.includes(intentTag));
}

export function getSuggestedHabitById(id: string): SuggestedHabit | undefined {
  return SUGGESTED_HABITS.find((habit) => habit.suggestedHabitId === id);
}

export function getStarterHabitForArea(area: SuggestedHabitLifeWheelArea): SuggestedHabit {
  return STARTER_HABIT_BY_AREA[area];
}
