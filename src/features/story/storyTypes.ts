export interface StorySoundtrackConfig {
  src: string;
  loop?: boolean;
  volume?: number;
}

/** Direction a scene travels toward as the story advances to the next scene. */
export type StoryDirection = 'left' | 'right' | 'up' | 'down';

/**
 * A single story scene. Mirrors the island story manifest panel shape so the
 * same content (island manifests, vision board images, …) can drive the shared
 * StoryPlayer. `advance` is the direction this scene exits toward when moving to
 * the next scene — the "bullet" the physical swipe/arrow follows.
 */
export type StoryPanel =
  | {
      id?: string;
      type: 'image';
      src: string;
      alt?: string;
      width?: number;
      height?: number;
      caption?: string;
      advance?: StoryDirection;
      soundtrack?: StorySoundtrackConfig;
    }
  | {
      id?: string;
      type: 'video';
      src: string;
      poster?: string;
      mutedAutoplay?: boolean;
      loop?: boolean;
      caption?: string;
      advance?: StoryDirection;
      soundtrack?: StorySoundtrackConfig;
    }
  | {
      id?: string;
      type: 'text';
      text: string;
      caption?: string;
      advance?: StoryDirection;
      soundtrack?: StorySoundtrackConfig;
    };

export const OPPOSITE_DIRECTION: Record<StoryDirection, StoryDirection> = {
  left: 'right',
  right: 'left',
  up: 'down',
  down: 'up',
};
