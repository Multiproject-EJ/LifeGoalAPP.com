export type WisdomTreeCategory =
  | 'Flame'
  | 'Hearth'
  | 'Tide'
  | 'Storm'
  | 'Bloom'
  | 'Mirror';

export type WisdomTreeChoice = {
  id: string;
  label: string;
  response: string;
};

export type WisdomTreeCard = {
  id: string;
  category: WisdomTreeCategory;
  title: string;
  storyLine: string;
  choices: WisdomTreeChoice[];
};

export const WISDOM_TREE_CARDS: WisdomTreeCard[] = [
  {
    id: 'flame-small-spark',
    category: 'Flame',
    title: 'A Small Spark',
    storyLine: 'Flame offers a tiny glow. Choose the warmth you want to carry.',
    choices: [
      {
        id: 'try-one-spark',
        label: 'Try one small spark',
        response: 'A tiny brave step can be enough for today.',
      },
      {
        id: 'rest-by-fire',
        label: 'Rest beside the fire',
        response: 'Rest can keep the little flame safe.',
      },
    ],
  },
  {
    id: 'hearth-soft-corner',
    category: 'Hearth',
    title: 'The Soft Corner',
    storyLine: 'Hearth makes room for comfort. Pick what feels gentle now.',
    choices: [
      {
        id: 'make-easier',
        label: 'Make one thing easier',
        response: 'Ease can be a kind companion.',
      },
      {
        id: 'let-wait',
        label: 'Let something wait',
        response: 'Some things can rest on the shelf for now.',
      },
      {
        id: 'choose-warmth',
        label: 'Choose a little warmth',
        response: 'A small comfort is welcome here.',
      },
    ],
  },
  {
    id: 'tide-gentle-shore',
    category: 'Tide',
    title: 'Gentle Shore',
    storyLine: 'Tide moves in and out. You can move at a kind pace too.',
    choices: [
      {
        id: 'loosen-plan',
        label: 'Loosen one plan',
        response: 'A softer shape might fit today.',
      },
      {
        id: 'keep-shore',
        label: 'Keep one steady shore',
        response: 'One steady thing can be enough to hold.',
      },
    ],
  },
  {
    id: 'storm-tucked-leaf',
    category: 'Storm',
    title: 'The Tucked Leaf',
    storyLine: 'Storm passes over the branches. The tree offers shelter.',
    choices: [
      {
        id: 'pause-cover',
        label: 'Pause under cover',
        response: 'A pause can be a quiet kind of progress.',
      },
      {
        id: 'name-sturdy',
        label: 'Name one sturdy thing',
        response: 'One sturdy thing can sit beside you.',
      },
    ],
  },
  {
    id: 'bloom-tiny-bud',
    category: 'Bloom',
    title: 'Tiny Bud',
    storyLine: 'Bloom notices a beginning, even when it is very small.',
    choices: [
      {
        id: 'water-tiny',
        label: 'Water one tiny thing',
        response: 'A little care can be plenty for one bud.',
      },
      {
        id: 'let-seed-rest',
        label: 'Let the seed rest',
        response: 'Rest can belong to beginnings too.',
      },
    ],
  },
  {
    id: 'mirror-moon-glimpse',
    category: 'Mirror',
    title: 'Moon Glimpse',
    storyLine: 'Mirror offers a glimpse, not a verdict. Choose what feels kind.',
    choices: [
      {
        id: 'notice-true',
        label: 'Notice one true thing',
        response: 'A small true thing can stay small and still matter.',
      },
      {
        id: 'leave-cloudy',
        label: 'Leave the mirror cloudy',
        response: 'Cloudy water can be left in peace.',
      },
    ],
  },
  {
    id: 'flame-lantern-path',
    category: 'Flame',
    title: 'Lantern Path',
    storyLine: 'A lantern glows beside the path. Take only the light that fits.',
    choices: [
      {
        id: 'carry-glow',
        label: 'Carry a small glow',
        response: 'The glow can be small and still useful.',
      },
      {
        id: 'sit-near-lantern',
        label: 'Sit near the lantern',
        response: 'Staying near warmth is welcome too.',
      },
    ],
  },
  {
    id: 'hearth-teacup-window',
    category: 'Hearth',
    title: 'Teacup Window',
    storyLine: 'A warm cup waits by the window. No need to hurry the moment.',
    choices: [
      {
        id: 'sip-slowly',
        label: 'Sip slowly',
        response: 'Slow can be a cozy way through.',
      },
      {
        id: 'watch-light',
        label: 'Watch the light',
        response: 'A quiet look can be enough for now.',
      },
      {
        id: 'set-cup-down',
        label: 'Set the cup down',
        response: 'You can leave the cup here and continue lightly.',
      },
    ],
  },
];

export function getWisdomTreeCardForIsland(
  islandNumber: number,
): WisdomTreeCard {
  const safeIslandNumber = Number.isFinite(islandNumber) ? Math.trunc(islandNumber) : 1;
  const cardIndex = Math.abs(safeIslandNumber - 1) % WISDOM_TREE_CARDS.length;
  return WISDOM_TREE_CARDS[cardIndex];
}
