import {
  PERSONALITY_QUESTION_BANK,
  PersonalityQuestion,
} from './personalityTestData';

/**
 * Presentation-only grouping of the foundation test into four suit-themed
 * sections. Scoring is order-independent, so this only shapes the quiz flow:
 * each section gets a short intro "reveal" screen and its own progress count,
 * which ties the test experience to the archetype deck metaphor.
 *
 * Colors intentionally mirror SUIT_COLORS in archetypes/archetypeDeck.ts
 * (not imported, to keep the question bank free of deck dependencies).
 */
export type QuizSection = {
  id: 'power' | 'heart' | 'mind' | 'spirit';
  icon: string;
  color: string;
  title: string;
  blurb: string;
  questionIds: string[];
};

export const QUIZ_SECTIONS: QuizSection[] = [
  {
    id: 'power',
    icon: '⚔️',
    color: '#ef4444',
    title: 'Power',
    blurb: 'How you organize, commit, and follow through. No wrong answers — honest beats impressive.',
    questionIds: [
      'big5_conscientiousness_01',
      'big5_conscientiousness_02',
      'big5_conscientiousness_03',
      'big5_conscientiousness_04',
      'custom_regulation_style_01',
      'custom_regulation_style_02',
    ],
  },
  {
    id: 'heart',
    icon: '💗',
    color: '#ec4899',
    title: 'Heart',
    blurb: 'How you connect with people and where your energy comes from.',
    questionIds: [
      'big5_extraversion_01',
      'big5_extraversion_02',
      'big5_extraversion_03',
      'big5_extraversion_04',
      'big5_agreeableness_01',
      'big5_agreeableness_02',
      'big5_agreeableness_03',
      'big5_agreeableness_04',
    ],
  },
  {
    id: 'mind',
    icon: '🧠',
    color: '#3b82f6',
    title: 'Mind',
    blurb: 'How you handle pressure and how you like to approach new challenges.',
    questionIds: [
      'big5_emotional_stability_01',
      'big5_emotional_stability_02',
      'big5_emotional_stability_03',
      'big5_emotional_stability_04',
      'custom_stress_response_01',
      'custom_stress_response_02',
      'custom_cognitive_entry_01',
      'custom_cognitive_entry_02',
    ],
  },
  {
    id: 'spirit',
    icon: '🔮',
    color: '#8b5cf6',
    title: 'Spirit',
    blurb: 'Your imagination, curiosity, and sense of who you are.',
    questionIds: [
      'big5_openness_01',
      'big5_openness_02',
      'big5_openness_03',
      'big5_openness_04',
      'custom_identity_sensitivity_01',
      'custom_identity_sensitivity_02',
    ],
  },
];

const QUESTION_BY_ID = new Map(
  PERSONALITY_QUESTION_BANK.map((question) => [question.id, question]),
);

/**
 * The question bank in section order. Throws at module load if a section
 * references an unknown question id, so drift between the bank and the
 * sections fails fast in dev/tests rather than mid-quiz.
 */
export const ORDERED_QUIZ_QUESTIONS: PersonalityQuestion[] = QUIZ_SECTIONS.flatMap(
  (section) =>
    section.questionIds.map((id) => {
      const question = QUESTION_BY_ID.get(id);
      if (!question) {
        throw new Error(`Quiz section "${section.id}" references unknown question ${id}`);
      }
      return question;
    }),
);

export type QuizPosition = {
  section: QuizSection;
  sectionIndex: number;
  questionInSection: number; // 1-based
  sectionSize: number;
};

/** Maps a flat index in ORDERED_QUIZ_QUESTIONS to its section position. */
export function getQuizPosition(index: number): QuizPosition {
  let offset = 0;
  for (let sectionIndex = 0; sectionIndex < QUIZ_SECTIONS.length; sectionIndex += 1) {
    const section = QUIZ_SECTIONS[sectionIndex];
    if (index < offset + section.questionIds.length) {
      return {
        section,
        sectionIndex,
        questionInSection: index - offset + 1,
        sectionSize: section.questionIds.length,
      };
    }
    offset += section.questionIds.length;
  }
  const lastSection = QUIZ_SECTIONS[QUIZ_SECTIONS.length - 1];
  return {
    section: lastSection,
    sectionIndex: QUIZ_SECTIONS.length - 1,
    questionInSection: lastSection.questionIds.length,
    sectionSize: lastSection.questionIds.length,
  };
}

/** True when the given flat index is the first question of its section. */
export function isSectionStart(index: number): boolean {
  return getQuizPosition(index).questionInSection === 1;
}
