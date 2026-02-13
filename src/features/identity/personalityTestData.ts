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
    text: 'I am the life of the party.',
    axisType: 'big5',
    dimensionKey: 'extraversion',
    reverseScored: false,
  },
  {
    id: 'big5_extraversion_02',
    text: 'I keep in the background.',
    axisType: 'big5',
    dimensionKey: 'extraversion',
    reverseScored: true,
  },
  {
    id: 'big5_extraversion_03',
    text: 'I talk to a lot of different people at gatherings.',
    axisType: 'big5',
    dimensionKey: 'extraversion',
    reverseScored: false,
  },
  {
    id: 'big5_extraversion_04',
    text: 'I am quiet around strangers.',
    axisType: 'big5',
    dimensionKey: 'extraversion',
    reverseScored: true,
  },
  {
    id: 'big5_agreeableness_01',
    text: "I feel little concern for others' needs.",
    axisType: 'big5',
    dimensionKey: 'agreeableness',
    reverseScored: true,
  },
  {
    id: 'big5_agreeableness_02',
    text: "I sympathize with others' feelings.",
    axisType: 'big5',
    dimensionKey: 'agreeableness',
    reverseScored: false,
  },
  {
    id: 'big5_agreeableness_03',
    text: "I am not interested in other people's problems.",
    axisType: 'big5',
    dimensionKey: 'agreeableness',
    reverseScored: true,
  },
  {
    id: 'big5_agreeableness_04',
    text: 'I take time out for others.',
    axisType: 'big5',
    dimensionKey: 'agreeableness',
    reverseScored: false,
  },
  {
    id: 'big5_conscientiousness_01',
    text: 'I leave my belongings around and often misplace things.',
    axisType: 'big5',
    dimensionKey: 'conscientiousness',
    reverseScored: true,
  },
  {
    id: 'big5_conscientiousness_02',
    text: 'I get chores or duties done right away.',
    axisType: 'big5',
    dimensionKey: 'conscientiousness',
    reverseScored: false,
  },
  {
    id: 'big5_conscientiousness_03',
    text: 'I often forget to put things back in their proper place.',
    axisType: 'big5',
    dimensionKey: 'conscientiousness',
    reverseScored: true,
  },
  {
    id: 'big5_conscientiousness_04',
    text: 'I follow a schedule and like to plan ahead.',
    axisType: 'big5',
    dimensionKey: 'conscientiousness',
    reverseScored: false,
  },
  {
    id: 'big5_emotional_stability_01',
    text: 'I am relaxed most of the time, even under pressure.',
    axisType: 'big5',
    dimensionKey: 'emotional_stability',
    reverseScored: false,
  },
  {
    id: 'big5_emotional_stability_02',
    text: 'I worry about many things.',
    axisType: 'big5',
    dimensionKey: 'emotional_stability',
    reverseScored: true,
  },
  {
    id: 'big5_emotional_stability_03',
    text: 'I seldom feel blue or depressed.',
    axisType: 'big5',
    dimensionKey: 'emotional_stability',
    reverseScored: false,
  },
  {
    id: 'big5_emotional_stability_04',
    text: 'I have frequent mood swings.',
    axisType: 'big5',
    dimensionKey: 'emotional_stability',
    reverseScored: true,
  },
  {
    id: 'big5_openness_01',
    text: 'I have a rich vocabulary and enjoy learning new words.',
    axisType: 'big5',
    dimensionKey: 'openness',
    reverseScored: false,
  },
  {
    id: 'big5_openness_02',
    text: 'I have difficulty understanding abstract ideas.',
    axisType: 'big5',
    dimensionKey: 'openness',
    reverseScored: true,
  },
  {
    id: 'big5_openness_03',
    text: 'I do not have a good imagination.',
    axisType: 'big5',
    dimensionKey: 'openness',
    reverseScored: true,
  },
  {
    id: 'big5_openness_04',
    text: 'I am full of ideas and like to explore different concepts.',
    axisType: 'big5',
    dimensionKey: 'openness',
    reverseScored: false,
  },
  {
    id: 'custom_regulation_style_01',
    text: 'I prefer having a clear plan or routine to manage my tasks and goals.',
    axisType: 'custom',
    dimensionKey: 'regulation_style',
    reverseScored: false,
  },
  {
    id: 'custom_regulation_style_02',
    text: 'I often improvise rather than follow a strict schedule or plan.',
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
    text: 'Under pressure, I often feel anxious, upset, or irritable.',
    axisType: 'custom',
    dimensionKey: 'stress_response',
    reverseScored: true,
  },
  {
    id: 'custom_identity_sensitivity_01',
    text: 'I spend a lot of time reflecting on who I am and what defines me as a person.',
    axisType: 'custom',
    dimensionKey: 'identity_sensitivity',
    reverseScored: false,
  },
  {
    id: 'custom_identity_sensitivity_02',
    text: 'I feel upset if someone questions or misunderstands my core values or personality.',
    axisType: 'custom',
    dimensionKey: 'identity_sensitivity',
    reverseScored: false,
  },
  {
    id: 'custom_cognitive_entry_01',
    text: 'When facing a new challenge, I prefer to dive in and learn by doing.',
    axisType: 'custom',
    dimensionKey: 'cognitive_entry',
    reverseScored: false,
  },
  {
    id: 'custom_cognitive_entry_02',
    text: 'I like to understand the big picture and have a plan before I start.',
    axisType: 'custom',
    dimensionKey: 'cognitive_entry',
    reverseScored: false,
  },
];
