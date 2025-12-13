/**
 * Types for guided meditation feature
 */

export type RevealMode = 'word' | 'sentence' | 'paragraph';

export type MeditationContent = {
  id: string;
  title: string;
  theme: string; // e.g., "Simple focus · presence · returning"
  content: string; // Full meditation text
  isPlaceholder: boolean; // True if meditation is not yet available
  placeholderMessage?: string; // Message to show for placeholder meditations
};

export type MeditationChunk = {
  text: string;
  index: number;
};

/**
 * Configuration for a meditation session
 */
export type MeditationSessionConfig = {
  meditationId: string;
  durationMinutes: number;
  revealMode: RevealMode;
};
