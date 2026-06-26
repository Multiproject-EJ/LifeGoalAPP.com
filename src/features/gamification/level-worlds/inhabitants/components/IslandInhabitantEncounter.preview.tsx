import React from 'react';
import { island001InhabitantDefinitions } from '../definitions/island001Inhabitants';
import { island001InhabitantTopicDefinitions } from '../definitions/island001Conversations';
import type { IslandInhabitantDefinition } from '../islandInhabitantTypes';
import type { IslandInhabitantTopicDefinition } from '../islandConversationTypes';
import { IslandInhabitantEncounter } from './IslandInhabitantEncounter';

const caretaker = island001InhabitantDefinitions[0];
const topics = island001InhabitantTopicDefinitions;
const longInhabitant: IslandInhabitantDefinition = { ...caretaker, id: 'long-name-preview', displayName: 'Caretaker of the Very Long Whispering Woodland Path', roleLabel: 'Keeper of the Gentle Paths, Mosslit Bridges, and Quiet Doorways' };
const longTopics: IslandInhabitantTopicDefinition[] = topics.map((topic, index) => ({ ...topic, id: `${topic.id}-long`, label: `${topic.label} Please explain it in a way that still wraps cleanly on tiny phone screens ${index + 1}.`, iconId: index === 0 ? 'mystery-unknown-icon' : topic.iconId }));
const fourTopics: IslandInhabitantTopicDefinition[] = [...topics, { id: 'i001-topic-fourth-preview', islandNumber: 1, inhabitantId: 'luma-caretaker', label: 'Show me the quietest path.', iconId: 'compass', conversationId: 'preview-only', order: 4 }];
const fireInhabitant: IslandInhabitantDefinition = { ...caretaker, id: 'fire-preview', biome: 'fire', displayName: 'Ember Caretaker' };

export function IslandInhabitantEncounterPreview(): React.JSX.Element {
  const [selectedTopic, setSelectedTopic] = React.useState<string>('none');
  const noopClose = () => undefined;
  return (
    <div data-preview="IslandInhabitantEncounter isolated preview states only">
      <p>Selected preview topic: {selectedTopic}</p>
      <IslandInhabitantEncounter isOpen inhabitant={caretaker} topics={topics} greeting="Welcome, traveller. The gentle paths have been quiet." characterArtSrc={caretaker.premiumArtSrc} backgroundArtSrc="/assets/islands/island-001/preview-background.webp" islandName="Luma Isle" islandStatusLabel="Island 1 woodland caretaker with three topics" onSelectTopic={(topic) => setSelectedTopic(topic.id)} onClose={noopClose} />
      {/* missing character-art fallback */}
      <IslandInhabitantEncounter isOpen={false} inhabitant={caretaker} topics={topics} greeting="Missing character-art fallback." backgroundArtSrc="/assets/islands/island-001/preview-background.webp" onSelectTopic={(topic) => setSelectedTopic(topic.id)} onClose={noopClose} />
      {/* missing background fallback */}
      <IslandInhabitantEncounter isOpen={false} inhabitant={caretaker} topics={topics} greeting="Missing background fallback." characterArtSrc={caretaker.premiumArtSrc} onSelectTopic={(topic) => setSelectedTopic(topic.id)} onClose={noopClose} />
      {/* long name and role */}
      <IslandInhabitantEncounter isOpen={false} inhabitant={longInhabitant} topics={topics} greeting="Long name and role preview." onSelectTopic={(topic) => setSelectedTopic(topic.id)} onClose={noopClose} />
      {/* long topic labels and unknown icon fallback */}
      <IslandInhabitantEncounter isOpen={false} inhabitant={caretaker} topics={longTopics} greeting="Long topic labels wrap safely." onSelectTopic={(topic) => setSelectedTopic(topic.id)} onClose={noopClose} />
      {/* two-topic state */}
      <IslandInhabitantEncounter isOpen={false} inhabitant={caretaker} topics={topics.slice(0, 2)} greeting="Two-topic state." onSelectTopic={(topic) => setSelectedTopic(topic.id)} onClose={noopClose} />
      {/* four-topic state */}
      <IslandInhabitantEncounter isOpen={false} inhabitant={caretaker} topics={fourTopics} greeting="Four-topic state." onSelectTopic={(topic) => setSelectedTopic(topic.id)} onClose={noopClose} />
      {/* fire biome token preview */}
      <IslandInhabitantEncounter isOpen={false} inhabitant={fireInhabitant} topics={topics} greeting="Fire biome token preview." onSelectTopic={(topic) => setSelectedTopic(topic.id)} onClose={noopClose} />
      {/* small-phone constrained-height preview */}
      <div style={{ width: 320, height: 568, overflow: 'hidden' }}>small-phone constrained-height preview</div>
      {/* reduced-motion state: verify with prefers-reduced-motion media rules */}
      <p>reduced-motion state covered by CSS prefers-reduced-motion.</p>
    </div>
  );
}
