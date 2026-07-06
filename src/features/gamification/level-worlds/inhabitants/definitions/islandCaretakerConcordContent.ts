import type { IslandConversationDefinition, IslandInhabitantTopicDefinition } from '../islandConversationTypes';
import type { IslandInhabitantBiome, IslandInhabitantDefinition } from '../islandInhabitantTypes';

/**
 * Concord caretaker content for islands 2 and onwards.
 *
 * After The Concord is restored on Island 1, every island's caretaker can be
 * spoken with through the same retro communication modal. Islands 2-5 are
 * authored against their narrative definitions (Pebble Bay, Coconut Cove,
 * Driftwood Isle, Crown of Tides); islands 6+ receive deterministic fallback
 * content until they are individually authored. Content is presentation-only —
 * the validation layer (`islandConversationValidation.ts`) prohibits rewards,
 * actions, and callbacks.
 */

export interface IslandCaretakerConcordContentEntry {
  islandNumber: number;
  islandName: string;
  inhabitant: IslandInhabitantDefinition;
  topics: IslandInhabitantTopicDefinition[];
  conversations: IslandConversationDefinition[];
}

/** Only two retro caretaker sprites exist today; green suits woodland islands. */
export function getCaretakerArtForBiome(biome: IslandInhabitantBiome): string {
  return biome === 'woodland'
    ? '/assets/island_caretakers/001/IMG_retro_green.webp'
    : '/assets/island_caretakers/001/IMG_retro_blue.webp';
}

interface TwoBranchConversationParams {
  id: string;
  islandNumber: number;
  inhabitantId: string;
  title: string;
  lines: [string, string];
  prompt: string;
  branches: [
    { id: string; label: string; response: string },
    { id: string; label: string; response: string },
  ];
  closeLabel: string;
  returnTo: 'encounter' | 'board';
}

/**
 * Builds the canonical caretaker conversation shape used by Island 1:
 * npc line → npc line → player choice (2 options) → npc response → close.
 * Depth stays at 5, inside the validator's maximum of 6.
 */
export function buildTwoBranchCaretakerConversation(params: TwoBranchConversationParams): IslandConversationDefinition {
  const [firstBranch, secondBranch] = params.branches;
  return {
    version: 1,
    id: params.id,
    islandNumber: params.islandNumber,
    inhabitantId: params.inhabitantId,
    title: params.title,
    openingNodeId: 'line-1',
    nodes: {
      'line-1': { type: 'npc', id: 'line-1', speakerId: params.inhabitantId, text: params.lines[0], nextNodeId: 'line-2' },
      'line-2': { type: 'npc', id: 'line-2', speakerId: params.inhabitantId, text: params.lines[1], nextNodeId: 'ask' },
      ask: { type: 'choice', id: 'ask', prompt: params.prompt, choices: [
        { id: firstBranch.id, label: firstBranch.label, nextNodeId: `reply-${firstBranch.id}` },
        { id: secondBranch.id, label: secondBranch.label, nextNodeId: `reply-${secondBranch.id}` },
      ] },
      [`reply-${firstBranch.id}`]: { type: 'npc', id: `reply-${firstBranch.id}`, speakerId: params.inhabitantId, text: firstBranch.response, nextNodeId: 'close' },
      [`reply-${secondBranch.id}`]: { type: 'npc', id: `reply-${secondBranch.id}`, speakerId: params.inhabitantId, text: secondBranch.response, nextNodeId: 'close' },
      close: { type: 'close', id: 'close', label: params.closeLabel, returnTo: params.returnTo },
    },
  };
}

interface CaretakerIslandAuthoring {
  islandNumber: number;
  islandName: string;
  inhabitantId: string;
  roleLabel: string;
  civilizationName: string;
  biome: IslandInhabitantBiome;
  nextStep: Omit<TwoBranchConversationParams, 'id' | 'islandNumber' | 'inhabitantId' | 'title' | 'closeLabel' | 'returnTo'> & { title: string };
  aboutIsland: Omit<TwoBranchConversationParams, 'id' | 'islandNumber' | 'inhabitantId' | 'title' | 'closeLabel' | 'returnTo'> & { title: string };
  aboutCaretaker: Omit<TwoBranchConversationParams, 'id' | 'islandNumber' | 'inhabitantId' | 'title' | 'closeLabel' | 'returnTo'> & { title: string };
}

function padIsland(islandNumber: number): string {
  return String(islandNumber).padStart(3, '0');
}

export function buildCaretakerConcordContentEntry(authoring: CaretakerIslandAuthoring): IslandCaretakerConcordContentEntry {
  const { islandNumber, inhabitantId } = authoring;
  const island = padIsland(islandNumber);
  const artSrc = getCaretakerArtForBiome(authoring.biome);
  const topicIds = {
    nextStep: `i${island}-topic-next-step`,
    aboutIsland: `i${island}-topic-island`,
    aboutCaretaker: `i${island}-topic-caretaker`,
  };
  const conversationIds = {
    nextStep: `I${island}-C01-next-step`,
    aboutIsland: `I${island}-C02-island`,
    aboutCaretaker: `I${island}-C03-caretaker`,
  };
  const inhabitant: IslandInhabitantDefinition = {
    version: 1,
    id: inhabitantId,
    islandNumber,
    displayName: 'Caretaker',
    roleLabel: authoring.roleLabel,
    civilizationName: authoring.civilizationName,
    archetype: 'servant_wizard',
    biome: authoring.biome,
    premiumArtSrc: artSrc,
    retroSpriteSrc: artSrc,
    defaultTopicIds: [topicIds.nextStep, topicIds.aboutIsland, topicIds.aboutCaretaker],
  };
  const topics: IslandInhabitantTopicDefinition[] = [
    { id: topicIds.nextStep, islandNumber, inhabitantId, label: authoring.nextStep.title, iconId: 'compass', conversationId: conversationIds.nextStep, order: 1 },
    { id: topicIds.aboutIsland, islandNumber, inhabitantId, label: authoring.aboutIsland.title, iconId: 'book', conversationId: conversationIds.aboutIsland, order: 2 },
    { id: topicIds.aboutCaretaker, islandNumber, inhabitantId, label: authoring.aboutCaretaker.title, iconId: 'inhabitant', conversationId: conversationIds.aboutCaretaker, order: 3 },
  ];
  const conversations: IslandConversationDefinition[] = [
    buildTwoBranchCaretakerConversation({ ...authoring.nextStep, id: conversationIds.nextStep, islandNumber, inhabitantId, closeLabel: 'Return to the island', returnTo: 'board' }),
    buildTwoBranchCaretakerConversation({ ...authoring.aboutIsland, id: conversationIds.aboutIsland, islandNumber, inhabitantId, closeLabel: 'Continue', returnTo: 'encounter' }),
    buildTwoBranchCaretakerConversation({ ...authoring.aboutCaretaker, id: conversationIds.aboutCaretaker, islandNumber, inhabitantId, closeLabel: 'Return', returnTo: 'encounter' }),
  ];
  return { islandNumber, islandName: authoring.islandName, inhabitant, topics, conversations };
}

/** Islands 2-5, authored against `narrative/definitions/island00XNarrative.ts`. */
export const authoredCaretakerConcordEntries: IslandCaretakerConcordContentEntry[] = [
  buildCaretakerConcordContentEntry({
    islandNumber: 2,
    islandName: 'Pebble Bay',
    inhabitantId: 'pebble-bay-caretaker',
    roleLabel: 'Keeper of the Turning Tides',
    civilizationName: 'The Tidefolk',
    biome: 'underwater',
    nextStep: {
      title: 'What should I do next?',
      lines: ['The Tide-Cradle is stirring…', 'Restore the Hatchery first, and the bay will answer.'],
      prompt: 'How do you answer?',
      branches: [
        { id: 'why-hatchery', label: 'Why the Hatchery?', response: 'New life turns the water. The bay remembers motion through its young.' },
        { id: 'begin-there', label: 'I’ll begin there.', response: 'Then follow the shore where the stones still turn. They keep the rhythm.' },
      ],
    },
    aboutIsland: {
      title: 'Tell me about Pebble Bay.',
      lines: ['Pebble Bay breathed with the tides, until the tides stopped.', 'Maelis the Tideward holds her breath, waiting for a wave that never came.'],
      prompt: 'What would you like to know?',
      branches: [
        { id: 'tide-return', label: 'Can the tide return?', response: 'Gentle, repeated motion can coax it back. One turned stone at a time.' },
        { id: 'who-maelis', label: 'Who is Maelis?', response: 'Our guardian. She is not attacking — she is afraid to exhale.' },
      ],
    },
    aboutCaretaker: {
      title: 'Who are you?',
      lines: ['We keep the lanterns and read the water for the Tidefolk.', 'The Concord carries our meaning to you now. It is good to be heard.'],
      prompt: 'What do you ask?',
      branches: [
        { id: 'tidefolk', label: 'Tell me about the Tidefolk.', response: 'Shore-people of rhythm and patience. They mend nets and wait well.' },
        { id: 'concord-thanks', label: 'I’m glad I can hear you.', response: 'As are we. Travellers carried silence for too long.' },
      ],
    },
  }),
  buildCaretakerConcordContentEntry({
    islandNumber: 3,
    islandName: 'Coconut Cove',
    inhabitantId: 'coconut-cove-caretaker',
    roleLabel: 'Keeper of the Shared Grove',
    civilizationName: 'The Covefolk',
    biome: 'woodland',
    nextStep: {
      title: 'What should I do next?',
      lines: ['The Grove is waking…', 'Restore the Hatchery first, and the island will answer.'],
      prompt: 'How do you answer?',
      branches: [
        { id: 'why-hatchery', label: 'Why the Hatchery?', response: 'The grove shares what it grows. Its young are the first gift back.' },
        { id: 'begin-there', label: 'I’ll begin there.', response: 'Then climb where the palms lean together. Pip will race you up.' },
      ],
    },
    aboutIsland: {
      title: 'Tell me about Coconut Cove.',
      lines: ['This grove once shared everything it grew.', 'When fear spread, Tamba the Grovekeeper curled around the canopy and would not let go.'],
      prompt: 'What would you like to know?',
      branches: [
        { id: 'open-grove', label: 'Can the grove open again?', response: 'Generosity wakes it. Every shared harvest loosens Tamba’s hold.' },
        { id: 'who-tamba', label: 'Who is Tamba?', response: 'A giant of leaf and bark. Gentle, but fear made the giant grip too tight.' },
      ],
    },
    aboutCaretaker: {
      title: 'Who are you?',
      lines: ['We tend the paths between the palms for the Covefolk.', 'Grandmother Liko keeps the stories; we keep the ground they walk on.'],
      prompt: 'What do you ask?',
      branches: [
        { id: 'covefolk', label: 'Tell me about the Covefolk.', response: 'Gatherers and storykeepers. Abundance shared is their oldest law.' },
        { id: 'same-hats', label: 'You look like the Luma caretaker.', response: 'Every island keeps its helpers. The hats travel further than we do.' },
      ],
    },
  }),
  buildCaretakerConcordContentEntry({
    islandNumber: 4,
    islandName: 'Driftwood Isle',
    inhabitantId: 'driftwood-isle-caretaker',
    roleLabel: 'Keeper of the Mended Shore',
    civilizationName: 'The Driftfolk',
    biome: 'woodland',
    nextStep: {
      title: 'What should I do next?',
      lines: ['The Hatchery is waking…', 'Restore it first, and the island will answer.'],
      prompt: 'How do you answer?',
      branches: [
        { id: 'why-hatchery', label: 'Why the Hatchery?', response: 'Rebuilding starts with what is newest. The young teach the shore to hope.' },
        { id: 'begin-there', label: 'I’ll begin there.', response: 'Good. Wren will meet you with salvaged planks and too many ideas.' },
      ],
    },
    aboutIsland: {
      title: 'Tell me about Driftwood Isle.',
      lines: ['A storm broke this isle, and the Driftfolk rebuilt it plank by plank.', 'Garran the Driftwarden froze mid-build, afraid the next wave would undo it all.'],
      prompt: 'What would you like to know?',
      branches: [
        { id: 'finish-build', label: 'Can the building finish?', response: 'Piece by piece. Every mended thing reminds Garran that breakage is not the end.' },
        { id: 'who-garran', label: 'Who is Garran?', response: 'Our great shore-guardian. His hands still hold the beam he never placed.' },
      ],
    },
    aboutCaretaker: {
      title: 'Who are you?',
      lines: ['We sort the salvage and keep the mending lists for the Driftfolk.', 'Old Fenn says a shore is mended by a hand, not the sea.'],
      prompt: 'What do you ask?',
      branches: [
        { id: 'driftfolk', label: 'Tell me about the Driftfolk.', response: 'Builders who waste nothing. Every broken thing here is a beginning.' },
        { id: 'concord-signal', label: 'The Concord translates you clearly.', response: 'A fine machine. It was mended too, as I hear it — fragment by fragment.' },
      ],
    },
  }),
  buildCaretakerConcordContentEntry({
    islandNumber: 5,
    islandName: 'Crown of Tides',
    inhabitantId: 'crown-of-tides-caretaker',
    roleLabel: 'Keeper of the Crown’s Song',
    civilizationName: 'The Reefborn',
    biome: 'underwater',
    nextStep: {
      title: 'What should I do next?',
      lines: ['The Tide Hatchery is stirring…', 'Restore it first, and the island will answer.'],
      prompt: 'How do you answer?',
      branches: [
        { id: 'why-hatchery', label: 'Why the Hatchery?', response: 'The reef sings through its young. Their song steadies the Crown.' },
        { id: 'begin-there', label: 'I’ll begin there.', response: 'Then follow the reef-runners. Reev knows every current worth riding.' },
      ],
    },
    aboutIsland: {
      title: 'Tell me about the Crown of Tides.',
      lines: ['The Crown once sang with the reef’s own voice.', 'Now Thalassa relays a borrowed song from somewhere far, and the reef has gone quiet.'],
      prompt: 'What would you like to know?',
      branches: [
        { id: 'true-song', label: 'Can the true song return?', response: 'Elder Cael believes so. Small true notes, woven back one by one.' },
        { id: 'who-thalassa', label: 'Who is Thalassa?', response: 'The Tide Sovereign. Crowned, proud, and caught singing words that are not hers.' },
      ],
    },
    aboutCaretaker: {
      title: 'Who are you?',
      lines: ['We mind the quiet places between the reef towers for the Reefborn.', 'The Tidesinger keeps the Crown’s song; we keep everything the song forgets.'],
      prompt: 'What do you ask?',
      branches: [
        { id: 'reefborn', label: 'Tell me about the Reefborn.', response: 'Singers and current-riders. They braid their days into the reef’s rhythm.' },
        { id: 'borrowed-song', label: 'What is the borrowed song?', response: 'A signal from far away, wearing the Crown’s voice. Listen closely as you climb.' },
      ],
    },
  }),
];

/**
 * Deterministic fallback caretaker content for islands without authored
 * entries (6+). Keeps the Concord conversation available on every island;
 * replace per-island by adding an authored entry above.
 */
export function buildFallbackCaretakerConcordContentEntry(islandNumber: number): IslandCaretakerConcordContentEntry {
  const island = padIsland(islandNumber);
  const biomes: IslandInhabitantBiome[] = ['woodland', 'underwater', 'fire', 'celestial'];
  return buildCaretakerConcordContentEntry({
    islandNumber,
    islandName: `Island ${islandNumber}`,
    inhabitantId: `island-${island}-caretaker`,
    roleLabel: 'Keeper of the Island Paths',
    civilizationName: 'The Island Keepers',
    biome: biomes[islandNumber % biomes.length],
    nextStep: {
      title: 'What should I do next?',
      lines: ['The Hatchery is waking…', 'Restore it first, and the island will answer.'],
      prompt: 'How do you answer?',
      branches: [
        { id: 'why-hatchery', label: 'Why the Hatchery?', response: 'New life remembers how the island once felt. Begin with what is young.' },
        { id: 'begin-there', label: 'I’ll begin there.', response: 'Then follow the gentle lights. They know the way.' },
      ],
    },
    aboutIsland: {
      title: 'Tell me about this island.',
      lines: ['This island drifted alone for a long time before your sail appeared.', 'Its keepers grew quiet when the fear spread, but they are still here, waiting.'],
      prompt: 'What would you like to know?',
      branches: [
        { id: 'wake-again', label: 'Can it wake again?', response: 'Small acts of care wake it, one landmark at a time.' },
        { id: 'the-fear', label: 'What caused the fear?', response: 'The same shadow that touched every island of the Drift. You will learn its shape.' },
      ],
    },
    aboutCaretaker: {
      title: 'Who are you?',
      lines: ['We are caretakers. Every island of the Drift keeps its helpers.', 'The Concord carries our meaning to you — your voice reaches us at last.'],
      prompt: 'What do you ask?',
      branches: [
        { id: 'the-concord', label: 'Tell me about the Concord.', response: 'The old expedition device you restored. It translates meaning, not just words.' },
        { id: 'glad-to-hear', label: 'I’m glad I can hear you.', response: 'As are we. Safe paths, traveller — the island is listening now.' },
      ],
    },
  });
}
