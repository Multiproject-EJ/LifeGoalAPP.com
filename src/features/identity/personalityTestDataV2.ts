/**
 * Foundation test v2 — 20 situational-judgement questions.
 *
 * Content source of truth: docs/product/personality-scenario-test-v2-draft.md
 *
 * Each option scores onto BOTH a user-facing game axis and one or more existing
 * trait/axis dimensions. That dual scoring is what lets the card read as "how
 * you play" while the 32-card archetype deck (and journal templates, avatar
 * unlocks, recommendations, compass bridges, dashboard — 19 files in total)
 * keep consuming the same PersonalityScores they always have.
 *
 * Direction is encoded per option, so there is no `reverseScored` flag and no
 * way to reintroduce the direction bug fixed in #3155.
 */

import type { DimensionKey } from './personalityTestData';

export type GameAxisKey = 'planner' | 'bounce_back' | 'coop' | 'explorer' | 'sprinter';

/** 1–5, where 5 is always the axis's "high" pole (see GAME_AXES). */
export type LoadValue = 1 | 2 | 3 | 4 | 5;

export type ScenarioOption = {
  id: string;
  label: string;
  axisLoad: LoadValue;
  traitLoads: Partial<Record<DimensionKey, LoadValue>>;
};

export type ScenarioQuestion = {
  id: string;
  axis: GameAxisKey;
  text: string;
  options: ScenarioOption[];
};

export type GameAxisDefinition = {
  key: GameAxisKey;
  icon: string;
  /** Section heading during the quiz. */
  sectionTitle: string;
  blurb: string;
  /** Label when the score is high (axisLoad 5) / low (axisLoad 1). */
  highLabel: string;
  lowLabel: string;
  color: string;
};

export const GAME_AXES: GameAxisDefinition[] = [
  {
    key: 'planner',
    icon: '⚙️',
    sectionTitle: 'How you set the board',
    blurb: 'How you like to set things up. No wrong answers here — honest beats impressive.',
    highLabel: 'Planner',
    lowLabel: 'Improviser',
    color: '#3b82f6',
  },
  {
    key: 'bounce_back',
    icon: '🔥',
    sectionTitle: 'What a miss does to you',
    blurb: 'What happens when things slip. This one tells us the most about how to support you.',
    highLabel: 'Bounce-back',
    lowLabel: 'Slow-burn',
    color: '#ef4444',
  },
  {
    key: 'coop',
    icon: '🤝',
    sectionTitle: "Who's in the room",
    blurb: 'Where your energy comes from, and who you want alongside you.',
    highLabel: 'Co-op',
    lowLabel: 'Solo',
    color: '#ec4899',
  },
  {
    key: 'explorer',
    icon: '🧭',
    sectionTitle: 'Same road, or a new one',
    blurb: 'Whether you want variety or a groove worth deepening.',
    highLabel: 'Explorer',
    lowLabel: 'Consolidator',
    color: '#8b5cf6',
  },
  {
    key: 'sprinter',
    icon: '⚡',
    sectionTitle: 'The pace you actually keep',
    blurb: 'How hard you go, and how long you keep going.',
    highLabel: 'Sprinter',
    lowLabel: 'Marathoner',
    color: '#f59e0b',
  },
];

export const GAME_AXIS_KEYS: GameAxisKey[] = GAME_AXES.map((axis) => axis.key);

export const SCENARIO_QUESTION_BANK: ScenarioQuestion[] = [
  // ── ⚙️ Planner ↔ Improviser ───────────────────────────────────────────────
  {
    id: 'v2_plan_01',
    axis: 'planner',
    text: 'Sunday night. The week ahead is a blank page. What actually happens?',
    options: [
      { id: 'a', label: 'I fill it in. Times, blocks, the lot.', axisLoad: 5, traitLoads: { regulation_style: 5, conscientiousness: 5 } },
      { id: 'b', label: 'I circle two or three things that matter and leave space around them.', axisLoad: 4, traitLoads: { regulation_style: 4, conscientiousness: 4 } },
      { id: 'c', label: "I've got a rough shape in my head. Nothing written down.", axisLoad: 2, traitLoads: { regulation_style: 2, conscientiousness: 3 } },
      { id: 'd', label: "Blank page sounds about right. I'll meet the week when it gets here.", axisLoad: 1, traitLoads: { regulation_style: 1, conscientiousness: 2 } },
    ],
  },
  {
    id: 'v2_plan_02',
    axis: 'planner',
    text: "You want to build a new habit. What's your opening move?",
    options: [
      { id: 'a', label: 'Pick a time, put it in the calendar, done.', axisLoad: 5, traitLoads: { regulation_style: 5, conscientiousness: 5 } },
      { id: 'b', label: 'Bolt it onto something I already do every day.', axisLoad: 4, traitLoads: { regulation_style: 4, conscientiousness: 4 } },
      { id: 'c', label: 'Start today. Work out the details later.', axisLoad: 2, traitLoads: { cognitive_entry: 1, conscientiousness: 3 } },
      { id: 'd', label: "Read up properly first. I like knowing what I'm walking into.", axisLoad: 3, traitLoads: { cognitive_entry: 5, conscientiousness: 4 } },
    ],
  },
  {
    id: 'v2_plan_03',
    axis: 'planner',
    text: 'Your evening is planned. Then a better offer lands. Be honest.',
    options: [
      { id: 'a', label: "Plan wins. I said I'd do it.", axisLoad: 5, traitLoads: { conscientiousness: 5, regulation_style: 4 } },
      { id: 'b', label: 'Offer wins — but the plan gets a new slot before I say yes.', axisLoad: 3, traitLoads: { conscientiousness: 4, regulation_style: 3 } },
      { id: 'c', label: 'Offer wins. The plan will keep.', axisLoad: 2, traitLoads: { conscientiousness: 2, regulation_style: 2 } },
      { id: 'd', label: 'Offer wins, and then I think about the plan all night.', axisLoad: 3, traitLoads: { emotional_stability: 2, identity_sensitivity: 4 } },
    ],
  },
  {
    id: 'v2_plan_04',
    axis: 'planner',
    text: 'Your to-do list, as it actually exists right now.',
    options: [
      { id: 'a', label: 'One list. In order. I work down it.', axisLoad: 5, traitLoads: { regulation_style: 5, conscientiousness: 5 } },
      { id: 'b', label: 'Three lists in three places, roughly current.', axisLoad: 3, traitLoads: { regulation_style: 3, conscientiousness: 3 } },
      { id: 'c', label: "It's in my head, and mostly that's fine.", axisLoad: 2, traitLoads: { regulation_style: 2, conscientiousness: 2 } },
      { id: 'd', label: 'I make beautiful lists and never look at them again.', axisLoad: 2, traitLoads: { regulation_style: 2, conscientiousness: 2, openness: 4 } },
    ],
  },

  // ── 🔥 Bounce-back ↔ Slow-burn ────────────────────────────────────────────
  {
    id: 'v2_bounce_01',
    axis: 'bounce_back',
    text: 'Twelve days into a streak. You miss one. Next morning?',
    options: [
      { id: 'a', label: 'Straight back on it. A day is a day.', axisLoad: 5, traitLoads: { stress_response: 5, emotional_stability: 5 } },
      { id: 'b', label: 'Back on it, though it nags at me for a while.', axisLoad: 4, traitLoads: { stress_response: 4, emotional_stability: 4 } },
      { id: 'c', label: 'It feels broken now, and I drift for a few days.', axisLoad: 2, traitLoads: { stress_response: 2, emotional_stability: 2 } },
      { id: 'd', label: "That's usually where it quietly ends.", axisLoad: 1, traitLoads: { stress_response: 1, emotional_stability: 2 } },
    ],
  },
  {
    id: 'v2_bounce_02',
    axis: 'bounce_back',
    text: "Something goes wrong, and it genuinely isn't your fault. First move?",
    options: [
      { id: 'a', label: 'Straight to: right, what now?', axisLoad: 5, traitLoads: { stress_response: 5, emotional_stability: 5 } },
      { id: 'b', label: 'Complain for sixty seconds, then get on with it.', axisLoad: 4, traitLoads: { stress_response: 4, emotional_stability: 4, extraversion: 4 } },
      { id: 'c', label: 'I chew it over for a while before I can move.', axisLoad: 2, traitLoads: { stress_response: 2, emotional_stability: 2 } },
      { id: 'd', label: 'It follows me around for the rest of the day.', axisLoad: 1, traitLoads: { stress_response: 1, emotional_stability: 1 } },
    ],
  },
  {
    id: 'v2_bounce_03',
    axis: 'bounce_back',
    text: 'Real pressure. A deadline, too much at once. What does it do to you?',
    options: [
      { id: 'a', label: "Sharpens me. I'm better under load.", axisLoad: 5, traitLoads: { stress_response: 5, emotional_stability: 5 } },
      { id: 'b', label: "I manage — but I'm no fun to be around.", axisLoad: 3, traitLoads: { stress_response: 3, agreeableness: 2, emotional_stability: 3 } },
      { id: 'c', label: 'I stall. Everything feels like too much to start.', axisLoad: 2, traitLoads: { stress_response: 2, emotional_stability: 2 } },
      { id: 'd', label: 'I get through it, and crash afterwards.', axisLoad: 3, traitLoads: { stress_response: 3, emotional_stability: 3 } },
    ],
  },
  {
    id: 'v2_bounce_04',
    axis: 'bounce_back',
    text: 'Someone criticises something you put real work into.',
    options: [
      { id: 'a', label: 'Good. What else have you got?', axisLoad: 5, traitLoads: { stress_response: 5, openness: 5, identity_sensitivity: 2 } },
      { id: 'b', label: "I'll use it — but it lands somewhere personal.", axisLoad: 3, traitLoads: { stress_response: 3, identity_sensitivity: 4 } },
      { id: 'c', label: 'I defend it first. I come round later, usually.', axisLoad: 3, traitLoads: { agreeableness: 2, identity_sensitivity: 4 } },
      { id: 'd', label: 'It knocks me off the whole thing for a while.', axisLoad: 2, traitLoads: { stress_response: 2, emotional_stability: 2, identity_sensitivity: 5 } },
    ],
  },

  // ── 🤝 Solo ↔ Co-op ───────────────────────────────────────────────────────
  {
    id: 'v2_coop_01',
    axis: 'coop',
    text: 'You set a goal that actually matters to you. Who knows?',
    options: [
      { id: 'a', label: 'People know. Being watched keeps me honest.', axisLoad: 5, traitLoads: { extraversion: 5 } },
      { id: 'b', label: 'One or two I trust.', axisLoad: 4, traitLoads: { extraversion: 3, agreeableness: 4 } },
      { id: 'c', label: "Nobody yet. They'll see the result.", axisLoad: 2, traitLoads: { extraversion: 2 } },
      { id: 'd', label: "Nobody, ever. It's mine.", axisLoad: 1, traitLoads: { extraversion: 1 } },
    ],
  },
  {
    id: 'v2_coop_02',
    axis: 'coop',
    text: 'Hard week, finally over. What actually refills the tank?',
    options: [
      { id: 'a', label: 'People. Noise. Being out.', axisLoad: 5, traitLoads: { extraversion: 5 } },
      { id: 'b', label: 'A couple of favourites, somewhere quiet.', axisLoad: 4, traitLoads: { extraversion: 3, agreeableness: 4 } },
      { id: 'c', label: 'My own company, my own thing.', axisLoad: 2, traitLoads: { extraversion: 2 } },
      { id: 'd', label: 'Nobody, for as long as I can get away with.', axisLoad: 1, traitLoads: { extraversion: 1 } },
    ],
  },
  {
    id: 'v2_coop_03',
    axis: 'coop',
    text: "You're stuck. Properly stuck. What happens next?",
    options: [
      { id: 'a', label: 'I talk it out loud at someone.', axisLoad: 5, traitLoads: { extraversion: 5, agreeableness: 4 } },
      { id: 'b', label: "I find someone who's already solved it.", axisLoad: 4, traitLoads: { extraversion: 4, agreeableness: 4, cognitive_entry: 4 } },
      { id: 'c', label: 'I stay with it until it gives.', axisLoad: 2, traitLoads: { extraversion: 2, conscientiousness: 4 } },
      { id: 'd', label: 'I walk away, and let it solve itself in the background.', axisLoad: 2, traitLoads: { extraversion: 2, openness: 4 } },
    ],
  },
  {
    id: 'v2_coop_04',
    axis: 'coop',
    text: "Someone gives you advice about your goal. It doesn't fit who you are.",
    options: [
      { id: 'a', label: 'I keep the useful bit and bin the rest.', axisLoad: 4, traitLoads: { identity_sensitivity: 3, openness: 4 } },
      { id: 'b', label: "I'll probably follow it anyway. They might know better.", axisLoad: 5, traitLoads: { agreeableness: 5, identity_sensitivity: 2 } },
      { id: 'c', label: 'I nod, thank them, and quietly ignore it.', axisLoad: 2, traitLoads: { agreeableness: 3, identity_sensitivity: 4 } },
      { id: 'd', label: "It bugs me that they've read me wrong.", axisLoad: 3, traitLoads: { identity_sensitivity: 5, emotional_stability: 2 } },
    ],
  },

  // ── 🧭 Explorer ↔ Consolidator ────────────────────────────────────────────
  {
    id: 'v2_explore_01',
    axis: 'explorer',
    text: "A routine has been working for six weeks. Where's your head at?",
    options: [
      { id: 'a', label: "Don't touch it. It's working.", axisLoad: 1, traitLoads: { openness: 2, conscientiousness: 5 } },
      { id: 'b', label: 'Keep the middle, fiddle with the edges.', axisLoad: 3, traitLoads: { openness: 3, conscientiousness: 4 } },
      { id: 'c', label: 'Getting itchy. Something needs to change.', axisLoad: 4, traitLoads: { openness: 4 } },
      { id: 'd', label: 'Already swapped it for something shinier.', axisLoad: 5, traitLoads: { openness: 5, conscientiousness: 2 } },
    ],
  },
  {
    id: 'v2_explore_02',
    axis: 'explorer',
    text: 'A free evening. Nothing owed to anyone. What pulls at you?',
    options: [
      { id: 'a', label: "Something I've never done.", axisLoad: 5, traitLoads: { openness: 5 } },
      { id: 'b', label: "Something I love and haven't touched in ages.", axisLoad: 3, traitLoads: { openness: 3 } },
      { id: 'c', label: "The usual. It's the usual for good reason.", axisLoad: 1, traitLoads: { openness: 2 } },
      { id: 'd', label: "Depends entirely who's free.", axisLoad: 3, traitLoads: { extraversion: 4 } },
    ],
  },
  {
    id: 'v2_explore_03',
    axis: 'explorer',
    text: "There's a better way to do something you already do. You…",
    options: [
      { id: 'a', label: 'Try it tonight.', axisLoad: 5, traitLoads: { openness: 5, cognitive_entry: 1 } },
      { id: 'b', label: 'Look into it properly, then decide.', axisLoad: 3, traitLoads: { openness: 4, cognitive_entry: 5 } },
      { id: 'c', label: 'Wait and see whether it sticks for anyone else.', axisLoad: 2, traitLoads: { openness: 2 } },
      { id: 'd', label: 'Stay where I am. Mine works.', axisLoad: 1, traitLoads: { openness: 1 } },
    ],
  },
  {
    id: 'v2_explore_04',
    axis: 'explorer',
    text: "You're about to try something you've genuinely never done. What do you need first?",
    options: [
      { id: 'a', label: 'Nothing. In at the deep end.', axisLoad: 5, traitLoads: { cognitive_entry: 1, openness: 4 } },
      { id: 'b', label: 'A quick look at how it works, then go.', axisLoad: 4, traitLoads: { cognitive_entry: 3, openness: 3 } },
      { id: 'c', label: 'The whole picture before I take a step.', axisLoad: 2, traitLoads: { cognitive_entry: 5, conscientiousness: 4 } },
      { id: 'd', label: 'Someone to show me once.', axisLoad: 3, traitLoads: { cognitive_entry: 3, extraversion: 4, agreeableness: 4 } },
    ],
  },

  // ── ⚡ Sprinter ↔ Marathoner ───────────────────────────────────────────────
  {
    id: 'v2_sprint_01',
    axis: 'sprinter',
    text: 'A big goal, three months out. How do you go at it?',
    options: [
      { id: 'a', label: 'Hard and fast up front, coast later.', axisLoad: 5, traitLoads: { conscientiousness: 3, stress_response: 4 } },
      { id: 'b', label: 'In bursts, whenever the energy shows up.', axisLoad: 4, traitLoads: { conscientiousness: 3 } },
      { id: 'c', label: 'A steady bit, most days.', axisLoad: 1, traitLoads: { conscientiousness: 5, regulation_style: 4 } },
      { id: 'd', label: 'Steady, then a proper sprint at the end.', axisLoad: 3, traitLoads: { conscientiousness: 4 } },
    ],
  },
  {
    id: 'v2_sprint_02',
    axis: 'sprinter',
    text: 'How big is the version of the habit you actually sign up for?',
    options: [
      { id: 'a', label: "Ambitious. I'd rather aim high and miss.", axisLoad: 5, traitLoads: { conscientiousness: 3 } },
      { id: 'b', label: 'A notch past comfortable.', axisLoad: 4, traitLoads: { conscientiousness: 4 } },
      { id: 'c', label: "Small enough that I'll definitely do it.", axisLoad: 1, traitLoads: { conscientiousness: 5, regulation_style: 4 } },
      { id: 'd', label: 'Whatever that particular day allows.', axisLoad: 2, traitLoads: { regulation_style: 1, conscientiousness: 2 } },
    ],
  },
  {
    id: 'v2_sprint_03',
    axis: 'sprinter',
    text: "Two weeks of going hard. The tank's low. You…",
    options: [
      { id: 'a', label: "Push on. Momentum's worth more than rest.", axisLoad: 5, traitLoads: { stress_response: 3, conscientiousness: 4 } },
      { id: 'b', label: 'Ease off on purpose, then pick it back up.', axisLoad: 2, traitLoads: { stress_response: 5, conscientiousness: 4 } },
      { id: 'c', label: 'Keep going until something stops me.', axisLoad: 5, traitLoads: { stress_response: 2, emotional_stability: 2 } },
      { id: 'd', label: 'Drop it, then feel bad about having dropped it.', axisLoad: 3, traitLoads: { stress_response: 2, emotional_stability: 2 } },
    ],
  },
  {
    id: 'v2_sprint_04',
    axis: 'sprinter',
    text: "Three weeks in. The novelty's gone. What keeps you in it?",
    options: [
      { id: 'a', label: "I said I would. That's just who I am.", axisLoad: 3, traitLoads: { identity_sensitivity: 5, conscientiousness: 5 } },
      { id: 'b', label: 'I can feel myself getting better at it.', axisLoad: 3, traitLoads: { identity_sensitivity: 4, openness: 4 } },
      { id: 'c', label: "The streak. I'm not breaking the streak.", axisLoad: 3, traitLoads: { conscientiousness: 4, regulation_style: 4 } },
      { id: 'd', label: 'Honestly? Not much. I need a fresh push.', axisLoad: 4, traitLoads: { conscientiousness: 2, openness: 4 } },
    ],
  },
];

const QUESTION_BY_ID = new Map(SCENARIO_QUESTION_BANK.map((q) => [q.id, q]));

export function getScenarioQuestion(id: string): ScenarioQuestion | undefined {
  return QUESTION_BY_ID.get(id);
}

export function getAxisDefinition(key: GameAxisKey): GameAxisDefinition {
  const found = GAME_AXES.find((axis) => axis.key === key);
  if (!found) throw new Error(`Unknown game axis: ${key}`);
  return found;
}

/** Questions grouped by axis, in GAME_AXES order — this is the quiz order. */
export const SCENARIO_QUESTIONS_BY_AXIS: { axis: GameAxisDefinition; questions: ScenarioQuestion[] }[] =
  GAME_AXES.map((axis) => ({
    axis,
    questions: SCENARIO_QUESTION_BANK.filter((question) => question.axis === axis.key),
  }));

/** Flat quiz order: all of one axis, then the next. */
export const ORDERED_SCENARIO_QUESTIONS: ScenarioQuestion[] = SCENARIO_QUESTIONS_BY_AXIS.flatMap(
  (group) => group.questions,
);

export type ScenarioPosition = {
  axis: GameAxisDefinition;
  axisIndex: number;
  /** 1-based position within the axis. */
  questionInAxis: number;
  axisSize: number;
};

export function getScenarioPosition(index: number): ScenarioPosition {
  let offset = 0;
  for (let axisIndex = 0; axisIndex < SCENARIO_QUESTIONS_BY_AXIS.length; axisIndex += 1) {
    const group = SCENARIO_QUESTIONS_BY_AXIS[axisIndex];
    if (index < offset + group.questions.length) {
      return {
        axis: group.axis,
        axisIndex,
        questionInAxis: index - offset + 1,
        axisSize: group.questions.length,
      };
    }
    offset += group.questions.length;
  }
  const last = SCENARIO_QUESTIONS_BY_AXIS[SCENARIO_QUESTIONS_BY_AXIS.length - 1];
  return {
    axis: last.axis,
    axisIndex: SCENARIO_QUESTIONS_BY_AXIS.length - 1,
    questionInAxis: last.questions.length,
    axisSize: last.questions.length,
  };
}

/** True when this flat index is the first question of its axis. */
export function isAxisStart(index: number): boolean {
  return getScenarioPosition(index).questionInAxis === 1;
}
