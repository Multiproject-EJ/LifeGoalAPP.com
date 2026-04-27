import type { LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';

export type StarterHabitPanel = {
  caption: string;
  imageUrl?: string;
};

export type StarterHabit = {
  title: string;
  description: string;
  emoji?: string;
  whyItWorks: string;
  howToStart: string;
  environmentHack: string;
  panels?: StarterHabitPanel[];
};

export const DEFAULT_STARTER_DOMAIN_KEY: LifeWheelCategoryKey = 'health_fitness';

export const STARTER_HABIT_CATALOG: Record<LifeWheelCategoryKey, StarterHabit[]> = {
  health_fitness: [
    {
      emoji: '🌞',
      title: 'Walk in the sunshine before breakfast',
      description: 'Step outside early and walk for a few minutes before food or screens.',
      whyItWorks: 'Morning light helps regulate your body clock, supports steadier energy, and can improve sleep later.',
      howToStart: 'Step outside for 3–10 minutes before breakfast. Even a short walk counts.',
      environmentHack: 'Place your shoes near the door the night before so the first step is frictionless.',
    },
    {
      emoji: '💧',
      title: 'Drink water before coffee',
      description: 'Have a glass of water before your first coffee or tea.',
      whyItWorks: 'You rehydrate after sleep first, which can improve alertness and reduce that instant caffeine crash feeling.',
      howToStart: 'Drink one full glass of water before your first caffeinated drink.',
      environmentHack: 'Leave a filled water bottle by your kettle or coffee maker every night.',
    },
    {
      emoji: '🍬',
      title: 'Remove excess candy/snacks from the home',
      description: 'Keep tempting snacks out of sight or out of the house. Buy small treats when truly wanted.',
      whyItWorks: 'Environment usually beats willpower. Fewer visible temptations means fewer automatic decisions.',
      howToStart: 'Remove or hide just the most tempting snack today; progress beats a perfect reset.',
      environmentHack: 'Buy treats in small portions when wanted instead of storing large packs at home.',
    },
  ],
  spirituality_community: [
    {
      emoji: '🌙',
      title: 'Night journal check-in',
      description: 'Write one answer: what gave me energy today, and what drained me?',
      whyItWorks: 'A tiny reflection builds self-awareness fast and helps you design better days.',
      howToStart: 'Write one sentence before bed: energy up, energy down.',
      environmentHack: 'Keep a pen and journal on your pillow so you must move it before sleep.',
    },
    {
      emoji: '🫁',
      title: 'One 3-minute breathing reset',
      description: 'Pause once today and breathe slowly for three minutes.',
      whyItWorks: 'Slow breathing lowers stress reactivity and creates a clean reset between tasks.',
      howToStart: 'Set a timer for 3 minutes and breathe in for 4, out for 6.',
      environmentHack: 'Attach the reset to a recurring moment like after lunch or before a meeting.',
    },
    {
      emoji: '📰',
      title: 'Limit mainstream news',
      description: 'Avoid random news scrolling. Choose one intentional news window if needed.',
      whyItWorks: 'Intentional windows reduce anxiety loops and protect attention for what matters today.',
      howToStart: 'Pick one short news window and skip reactive checking outside it.',
      environmentHack: 'Move news apps off your home screen and disable breaking-news notifications.',
    },
  ],
  living_spaces: [
    {
      emoji: '🎧',
      title: 'Podcast clean-up',
      description: 'Put on a podcast or music and reset one small area of your living space.',
      whyItWorks: 'Pairing cleanup with audio makes the task feel lighter and easier to repeat.',
      howToStart: 'Set one episode and clean a single zone until it ends.',
      environmentHack: 'Keep a small basket in each room for quick reset items.',
    },
    {
      emoji: '🧹',
      title: 'Clear one visible surface',
      description: 'Clear one desk, table, counter, or floor area before bed.',
      whyItWorks: 'A clear visual surface lowers mental load and creates momentum for tomorrow.',
      howToStart: 'Choose one surface and remove everything that does not belong there.',
      environmentHack: 'Create a tiny “later bin” so sorting does not block quick resets.',
    },
    {
      emoji: '🎒',
      title: "Prepare tomorrow's first item",
      description: 'Place the first thing you need tomorrow where it is easy to start.',
      whyItWorks: 'Starting friction predicts follow-through. A prepared first step boosts consistency.',
      howToStart: 'Pick one item for tomorrow and place it in plain sight tonight.',
      environmentHack: 'Use a fixed launch spot near your door for next-day essentials.',
    },
  ],
  career_development: [
    {
      emoji: '🎯',
      title: 'Choose one must-win task',
      description: 'Before distractions, pick the one task that would make today meaningful.',
      whyItWorks: 'One clear priority prevents attention drift and raises daily completion quality.',
      howToStart: 'Write your must-win task before opening chat or email.',
      environmentHack: 'Keep a sticky note titled “must-win” on your desk for daily focus.',
    },
    {
      emoji: '✍️',
      title: '10-minute ugly first draft',
      description: 'Work badly on purpose for 10 minutes to break the freeze.',
      whyItWorks: 'Perfection blocks momentum; an intentionally rough draft removes pressure and starts progress.',
      howToStart: 'Set 10 minutes and produce a bad first version without editing.',
      environmentHack: 'Start with a template file called “Ugly First Draft” to reduce activation energy.',
    },
    {
      emoji: '➡️',
      title: "Write tomorrow's first move",
      description: 'Before ending work, write the first tiny action for tomorrow.',
      whyItWorks: 'Pre-deciding the next step cuts startup delay and protects early focus.',
      howToStart: 'End each day by writing one concrete first action for tomorrow.',
      environmentHack: 'Leave tomorrow’s first tab or document open before signing off.',
    },
  ],
  finance_wealth: [
    {
      emoji: '🪨',
      title: 'Clear one admin pebble',
      description: 'Do one small admin task. If there is genuinely none today, mark it complete.',
      whyItWorks: 'Small admin friction compounds. Clearing one pebble daily prevents hidden stress build-up.',
      howToStart: 'Handle one 2–10 minute admin task: bill, form, reply, or filing.',
      environmentHack: 'Keep a running “admin pebbles” note so tasks are visible and easy to grab.',
    },
    {
      emoji: '🔁',
      title: 'Check one recurring cost',
      description: 'Review one subscription, bill, or recurring payment.',
      whyItWorks: 'Recurring costs are easy to ignore; tiny reviews protect cash flow over time.',
      howToStart: 'Open one recurring charge and confirm it is still worth keeping.',
      environmentHack: 'Create a recurring calendar reminder called “one cost check” each week.',
    },
    {
      emoji: '🌱',
      title: 'Move a tiny amount toward future-you',
      description: 'Save, invest, or set aside even a small amount on a chosen schedule.',
      whyItWorks: 'Consistency beats size. Tiny repeated transfers build identity and long-term resilience.',
      howToStart: 'Transfer a small fixed amount to savings or investment today.',
      environmentHack: 'Automate the transfer so the habit runs without daily decisions.',
    },
  ],
  love_relations: [
    {
      emoji: '💌',
      title: 'Send one warm message',
      description: 'Send a kind message to someone with no agenda.',
      whyItWorks: 'Small moments of warmth strengthen trust and connection over time.',
      howToStart: 'Send one short message of care without asking for anything back.',
      environmentHack: 'Keep a short list of people you want to nurture and rotate through it.',
    },
    {
      emoji: '💬',
      title: 'Give one specific appreciation',
      description: 'Tell someone one specific thing you appreciate about them.',
      whyItWorks: 'Specific appreciation lands deeper than generic praise and reinforces closeness.',
      howToStart: 'Name one exact behavior or quality you appreciated today.',
      environmentHack: 'Capture appreciation moments in notes so you can share them naturally later.',
    },
    {
      emoji: '🕊️',
      title: 'Pause before reacting',
      description: 'In one tense moment, take one breath before responding.',
      whyItWorks: 'One breath increases response control and lowers avoidable relationship damage.',
      howToStart: 'In one tense moment, inhale and exhale once before speaking.',
      environmentHack: 'Use a cue phrase like “one breath first” on your lock screen.',
    },
  ],
  family_friends: [
    {
      emoji: '📞',
      title: 'Reach out to one person',
      description: 'Send a short message or voice note to a family member or friend.',
      whyItWorks: 'Consistency keeps relationships warm better than occasional big gestures.',
      howToStart: 'Send one quick text, voice note, or call check-in today.',
      environmentHack: 'Set a daily reminder named “one person” at a low-stress hour.',
    },
    {
      emoji: '🙏',
      title: 'Share one appreciation',
      description: 'Tell someone one thing you genuinely appreciate about them.',
      whyItWorks: 'Recognition builds emotional safety and increases positive connection loops.',
      howToStart: 'Share one specific appreciation in person or by message.',
      environmentHack: 'Keep a running “gratitude for people” list to make this effortless.',
    },
    {
      emoji: '📅',
      title: 'Plan one small connection moment',
      description: 'Suggest a walk, call, meal, or simple catch-up.',
      whyItWorks: 'Plans convert good intentions into real connection before calendars fill up.',
      howToStart: 'Send one concrete invitation with a time option.',
      environmentHack: 'Reserve one recurring weekly slot for social connection.',
    },
  ],
  fun_creativity: [
    {
      emoji: '✨',
      title: 'Do one tiny alive thing',
      description: 'Do one small thing purely because it makes life feel more alive.',
      whyItWorks: 'Small joy moments restore energy and reduce burnout from all-duty days.',
      howToStart: 'Pick one 5-minute action that feels fun, curious, or playful.',
      environmentHack: 'Keep a shortlist of “alive” micro-activities for low-energy days.',
    },
    {
      emoji: '👀',
      title: 'Notice one beautiful thing',
      description: 'Pause once today and notice something beautiful, funny, or strange.',
      whyItWorks: 'Intentional noticing trains attention toward richness instead of constant threat scanning.',
      howToStart: 'Pause once and name one thing that catches your eye or heart.',
      environmentHack: 'Pair this with a daily transition like commute, lunch, or sunset.',
    },
    {
      emoji: '🎨',
      title: 'Make or play for 10 minutes',
      description: 'Spend 10 minutes making, playing, sketching, dancing, writing, or exploring.',
      whyItWorks: 'Short creative sessions keep self-expression alive without needing perfect conditions.',
      howToStart: 'Set a 10-minute timer and create without evaluating quality.',
      environmentHack: 'Leave one creative tool visible and ready so you can start immediately.',
    },
  ],
};
