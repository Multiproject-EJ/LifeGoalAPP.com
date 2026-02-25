export type GratitudeCoachResult = {
  isAuthentic: boolean;
  score: number;
  feedback: string;
  warning?: string;
};

const HARMFUL_PATTERNS = [
  /glad\s+(they|he|she|someone)\s+suffer/i,
  /deserv(ed|es)\s+to\s+suffer/i,
  /happy\s+they\s+failed/i,
  /revenge/i,
  /payback/i,
  /i\s+love\s+seeing\s+.*pain/i,
  /schadenfreude/i,
];

const GRATITUDE_SIGNALS = [
  /grateful/i,
  /thankful/i,
  /appreciate/i,
  /blessed/i,
  /support/i,
  /helped me/i,
  /small win/i,
  /kind/i,
];

export function getGratitudeCoachFeedback(content: string): GratitudeCoachResult {
  const text = content.trim();
  if (!text) {
    return {
      isAuthentic: false,
      score: 0,
      feedback:
        'Try adding at least one real moment of gratitude. Keep it specific: what happened, who helped, and why it mattered.',
    };
  }

  const hasHarmfulTone = HARMFUL_PATTERNS.some((pattern) => pattern.test(text));
  const signalCount = GRATITUDE_SIGNALS.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
  const score = Math.min(100, signalCount * 20 + Math.min(text.length / 8, 20));

  if (hasHarmfulTone) {
    return {
      isAuthentic: false,
      score: Math.max(10, score - 30),
      warning:
        'Coach detected language that may celebrate another person’s pain. That does not count as gratitude practice.',
      feedback:
        'Try reframing toward your own growth, support, or lessons learned. Gratitude works best when it is compassionate and honest.',
    };
  }

  if (score >= 65) {
    return {
      isAuthentic: true,
      score,
      feedback:
        'Beautiful entry. You named concrete moments and why they mattered. Keep this tone—specific, warm, and grounded in real life.',
    };
  }

  return {
    isAuthentic: true,
    score,
    feedback:
      'Good start. To deepen the effect, add one line for each gratitude item: “why this mattered” or “what support made it possible.”',
  };
}
