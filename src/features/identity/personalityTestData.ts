export type TraitKey =
  | 'openness'
  | 'conscientiousness'
  | 'extraversion'
  | 'agreeableness'
  | 'emotional_stability';

export type AxisKey =
  | 'regulation_style'
  | 'stress_response'
  | 'identity_sensitivity'
  | 'cognitive_entry'
  | 'honesty_humility'
  | 'emotionality';

export type AnswerValue = 1 | 2 | 3 | 4 | 5;

export type AxisType = 'big5' | 'custom';

export type DimensionKey = TraitKey | AxisKey;

export type PersonalityQuestion = {
  id: string;
  text: string;
  axisType: AxisType;
  dimensionKey: DimensionKey;
  reverseScored: boolean;
};

export const PERSONALITY_QUESTION_BANK: PersonalityQuestion[] = [
  {
    id: 'big5_extraversion_01',
    text: 'I bring energy to a group and enjoy being in the middle of it.',
    axisType: 'big5',
    dimensionKey: 'extraversion',
    reverseScored: false,
  },
  {
    id: 'big5_extraversion_02',
    text: 'In groups, I prefer to stay in the background.',
    axisType: 'big5',
    dimensionKey: 'extraversion',
    reverseScored: true,
  },
  {
    id: 'big5_extraversion_03',
    text: 'At gatherings, I end up talking with lots of different people.',
    axisType: 'big5',
    dimensionKey: 'extraversion',
    reverseScored: false,
  },
  {
    id: 'big5_extraversion_04',
    text: 'I stay quiet around people I don\'t know yet.',
    axisType: 'big5',
    dimensionKey: 'extraversion',
    reverseScored: true,
  },
  {
    id: 'big5_agreeableness_01',
    text: "I usually focus on my own goals before other people's needs.",
    axisType: 'big5',
    dimensionKey: 'agreeableness',
    reverseScored: true,
  },
  {
    id: 'big5_agreeableness_02',
    text: "I easily tune into how other people are feeling.",
    axisType: 'big5',
    dimensionKey: 'agreeableness',
    reverseScored: false,
  },
  {
    id: 'big5_agreeableness_03',
    text: "I prefer to keep some distance from other people's problems.",
    axisType: 'big5',
    dimensionKey: 'agreeableness',
    reverseScored: true,
  },
  {
    id: 'big5_agreeableness_04',
    text: 'I regularly make time to help the people around me.',
    axisType: 'big5',
    dimensionKey: 'agreeableness',
    reverseScored: false,
  },
  {
    id: 'big5_conscientiousness_01',
    text: 'I often misplace my things.',
    axisType: 'big5',
    dimensionKey: 'conscientiousness',
    reverseScored: true,
  },
  {
    id: 'big5_conscientiousness_02',
    text: 'I handle tasks and chores right away instead of putting them off.',
    axisType: 'big5',
    dimensionKey: 'conscientiousness',
    reverseScored: false,
  },
  {
    id: 'big5_conscientiousness_03',
    text: 'I often forget to put things back where they belong.',
    axisType: 'big5',
    dimensionKey: 'conscientiousness',
    reverseScored: true,
  },
  {
    id: 'big5_conscientiousness_04',
    text: 'I like to plan my days ahead of time.',
    axisType: 'big5',
    dimensionKey: 'conscientiousness',
    reverseScored: false,
  },
  {
    id: 'big5_emotional_stability_01',
    text: 'I stay relaxed even when things get busy or intense.',
    axisType: 'big5',
    dimensionKey: 'emotional_stability',
    reverseScored: false,
  },
  {
    id: 'big5_emotional_stability_02',
    text: 'I find myself worrying about many things.',
    axisType: 'big5',
    dimensionKey: 'emotional_stability',
    reverseScored: true,
  },
  {
    id: 'big5_emotional_stability_03',
    text: 'My mood usually stays steady from day to day.',
    axisType: 'big5',
    dimensionKey: 'emotional_stability',
    reverseScored: false,
  },
  {
    id: 'big5_emotional_stability_04',
    text: 'My mood can swing a lot within a single day.',
    axisType: 'big5',
    dimensionKey: 'emotional_stability',
    reverseScored: true,
  },
  {
    id: 'big5_openness_01',
    text: 'I enjoy learning new ideas just for the fun of it.',
    axisType: 'big5',
    dimensionKey: 'openness',
    reverseScored: false,
  },
  {
    id: 'big5_openness_02',
    text: 'Abstract, theoretical ideas are hard for me to get into.',
    axisType: 'big5',
    dimensionKey: 'openness',
    reverseScored: true,
  },
  {
    id: 'big5_openness_03',
    text: 'I rarely daydream or imagine different possibilities.',
    axisType: 'big5',
    dimensionKey: 'openness',
    reverseScored: true,
  },
  {
    id: 'big5_openness_04',
    text: 'I\'m constantly coming up with new ideas to explore.',
    axisType: 'big5',
    dimensionKey: 'openness',
    reverseScored: false,
  },
  {
    id: 'custom_regulation_style_01',
    text: 'I do my best work with a clear plan or routine.',
    axisType: 'custom',
    dimensionKey: 'regulation_style',
    reverseScored: false,
  },
  {
    id: 'custom_regulation_style_02',
    text: 'I\'d rather improvise than follow a strict schedule.',
    axisType: 'custom',
    dimensionKey: 'regulation_style',
    reverseScored: true,
  },
  {
    id: 'custom_stress_response_01',
    text: 'In stressful situations, I manage to stay calm and level-headed.',
    axisType: 'custom',
    dimensionKey: 'stress_response',
    reverseScored: false,
  },
  {
    id: 'custom_stress_response_02',
    text: 'Under pressure, I get tense or irritable.',
    axisType: 'custom',
    dimensionKey: 'stress_response',
    reverseScored: true,
  },
  {
    id: 'custom_identity_sensitivity_01',
    text: 'I spend a lot of time reflecting on who I am.',
    axisType: 'custom',
    dimensionKey: 'identity_sensitivity',
    reverseScored: false,
  },
  {
    id: 'custom_identity_sensitivity_02',
    text: 'It stings when someone misreads who I am or what I stand for.',
    axisType: 'custom',
    dimensionKey: 'identity_sensitivity',
    reverseScored: false,
  },
  {
    id: 'custom_cognitive_entry_01',
    text: 'When facing a new challenge, I prefer to dive in and learn by doing.',
    axisType: 'custom',
    dimensionKey: 'cognitive_entry',
    // High cognitive_entry = understand-first (see AXIS_NARRATIVES), so the
    // dive-in/learn-by-doing item must count toward the low end.
    reverseScored: true,
  },
  {
    id: 'custom_cognitive_entry_02',
    text: 'I like to understand the big picture and have a plan before I start.',
    axisType: 'custom',
    dimensionKey: 'cognitive_entry',
    reverseScored: false,
  },
];
