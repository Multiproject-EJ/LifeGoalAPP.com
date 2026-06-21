import type { CompassAnswerRecord, CompassBookChapterId } from '../../types';
import { projectLivingWheel } from '../../logic/projectors/livingWheelProjector';
import { projectInnerCompass } from '../../logic/projectors/innerCompassProjector';
import { projectLivingHorizon } from '../../logic/projectors/livingHorizonProjector';
import { projectIkigaiMap } from '../../logic/projectors/ikigaiMapProjector';
import { projectQuestForge } from '../../logic/projectors/questForgeProjector';
import { projectPersonalPlaybook } from '../../logic/projectors/personalPlaybookProjector';
import { LivingWheelGraphic } from './LivingWheelGraphic';
import { InnerCompassGraphic } from './InnerCompassGraphic';
import { LivingHorizonGraphic } from './LivingHorizonGraphic';
import { IkigaiMapGraphic } from './IkigaiMapGraphic';
import { QuestForgeGraphic } from './QuestForgeGraphic';
import { PersonalPlaybookGraphic } from './PersonalPlaybookGraphic';

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
  if (chapterId === 'inner_compass') {
    return <InnerCompassGraphic output={projectInnerCompass(answers)} mode={mode} />;
  }
  if (chapterId === 'living_horizon') {
    return <LivingHorizonGraphic output={projectLivingHorizon(answers)} mode={mode} />;
  }
  if (chapterId === 'ikigai_map') {
    return <IkigaiMapGraphic output={projectIkigaiMap(answers)} mode={mode} />;
  }
  if (chapterId === 'quest_forge') {
    return <QuestForgeGraphic output={projectQuestForge(answers)} mode={mode} />;
  }
  if (chapterId === 'personal_playbook') {
    return <PersonalPlaybookGraphic output={projectPersonalPlaybook(answers)} mode={mode} />;
  }
  return (
    <div className={`compass-wheel compass-wheel--${mode} compass-wheel--placeholder`}>
      <p className="compass-wheel__placeholder">This chapter’s graphic is coming soon.</p>
    </div>
  );
}
