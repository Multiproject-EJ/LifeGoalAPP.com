import type { CompassAnswerRecord, CompassBookChapterId } from '../../types';
import { projectLivingWheel } from '../../logic/projectors/livingWheelProjector';
import { LivingWheelGraphic } from './LivingWheelGraphic';

export type CompassChapterGraphicProps = {
  chapterId: CompassBookChapterId;
  answers: readonly CompassAnswerRecord[];
  mode: 'compact' | 'full';
};

/**
 * Shared chapter-graphic entry point. Dispatches to the per-chapter visual,
 * computing the chapter output from answers via the deterministic projector.
 * Powers both the full book and (later) the compact in-game Compass. Only
 * Chapter 1 is implemented; other chapters render a placeholder.
 */
export function CompassChapterGraphic({ chapterId, answers, mode }: CompassChapterGraphicProps) {
  if (chapterId === 'living_wheel') {
    return <LivingWheelGraphic output={projectLivingWheel(answers)} mode={mode} />;
  }
  return (
    <div className={`compass-wheel compass-wheel--${mode} compass-wheel--placeholder`}>
      <p className="compass-wheel__placeholder">This chapter’s graphic is coming soon.</p>
    </div>
  );
}
