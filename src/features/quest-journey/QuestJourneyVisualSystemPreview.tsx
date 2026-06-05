import { useState } from 'react';
import {
  QuestCompanionCard,
  QuestGlassCard,
  QuestHeroCard,
  QuestJourneyShell,
  QuestLifeAreaChip,
  QuestMetricRing,
  QuestModalSheet,
  QuestPrimaryAction,
  QuestProgressBar,
  QuestSecondaryAction,
  QuestSectionHeader,
  QuestToolCard,
  QuestTraitCard,
} from './QuestJourneyVisualSystem';

const lifeAreas = [
  { label: 'Body & Energy', icon: '✦', active: true },
  { label: 'Mind & Meaning', icon: '◇', strong: true },
  { label: 'Money & Admin', icon: '◌' },
  { label: 'Home', icon: '△', needsCare: true },
];

const tools = [
  {
    icon: '⌁',
    title: 'Direction',
    summary: 'Read the Life Wheel signal and choose the chapter that matters now.',
    status: 'Recommended',
    recommended: true,
  },
  {
    icon: '✧',
    title: 'Execution',
    summary: 'Turn the chapter into one tiny ritual and one supporting routine.',
    status: 'Ready',
  },
  {
    icon: '☾',
    title: 'Reflection',
    summary: 'Capture what changed today so the companion can help you adapt.',
    status: 'Quiet path',
  },
];

export function QuestJourneyVisualSystemPreview() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <QuestJourneyShell className="quest-journey-preview">
      <div className="quest-journey-preview__topbar">
        <p>
          Static dev-only preview for Phase 0.5. This route uses mock data only and does not call Supabase,
          gameplay, rewards, telemetry, or production feature services.
        </p>
        <span className="quest-journey-preview__badge">Dev visual preview</span>
      </div>

      <QuestHeroCard
        eyebrow="Quest Journey · Direction"
        title="Rebuild your energy with a calmer first step."
        summary="Your Life Wheel signal points to Body & Energy this week. Start with one gentle morning ritual before opening the deeper tools."
        pillar="direction"
        meta={
          <>
            <QuestLifeAreaChip label="Body & Energy" icon="✦" active />
            <QuestLifeAreaChip label="Home needs care" icon="△" needsCare />
          </>
        }
        actions={
          <>
            <QuestPrimaryAction icon="✦">Start today’s quest step</QuestPrimaryAction>
            <QuestSecondaryAction>Review the map</QuestSecondaryAction>
          </>
        }
        visual={<div className="quest-preview-compass" aria-label="Gold compass visual" role="img" />}
      />

      <QuestSectionHeader
        eyebrow="Foundation components"
        title="Premium glass surfaces and hierarchy"
        summary="The preview checks whether hero-first hierarchy, one primary action, companion guidance, and secondary tools can share one visual language."
        action={<QuestSecondaryAction onClick={() => setIsModalOpen(true)}>Open modal sheet</QuestSecondaryAction>}
      />

      <div className="quest-preview-grid quest-preview-grid--two">
        <QuestGlassCard
          title="QuestGlassCard"
          footer={
            <>
              <QuestSecondaryAction variant="ghost">Secondary path</QuestSecondaryAction>
              <QuestPrimaryAction variant="progress">Continue</QuestPrimaryAction>
            </>
          }
          strong
        >
          <p>
            A reusable frosted container for secondary sections. It keeps operational details available
            without competing with the emotional hero card.
          </p>
          <div className="quest-preview-chip-row">
            {lifeAreas.map((area) => (
              <QuestLifeAreaChip
                key={area.label}
                label={area.label}
                icon={area.icon}
                active={area.active}
                needsCare={area.needsCare}
                strong={area.strong}
              />
            ))}
          </div>
        </QuestGlassCard>

        <QuestCompanionCard
          source="Companion preview"
          title="Coach noticed a cleaner path."
          insight="Keep the first action emotionally small: sunlight, water, and one sentence of reflection are enough to begin the chapter."
          reason="Mock reason: this card demonstrates interpreted data language before detailed metrics."
          action={<QuestPrimaryAction icon="✧">Ask for a 5-minute plan</QuestPrimaryAction>}
        />
      </div>

      <div className="quest-preview-grid">
        {tools.map((tool) => (
          <QuestToolCard
            key={tool.title}
            icon={tool.icon}
            title={tool.title}
            summary={tool.summary}
            status={tool.status}
            recommended={tool.recommended}
          />
        ))}
      </div>

      <div className="quest-preview-grid quest-preview-grid--two">
        <QuestGlassCard title="Metrics and progression" subtle>
          <div className="quest-preview-metrics">
            <QuestMetricRing value={72} label="Journey depth" caption="Mock profile clarity" variant="progress" />
            <QuestMetricRing value={44} label="Focus" caption="Needs care" variant="gold" />
          </div>
          <div className="quest-preview-stack">
            <QuestProgressBar value={68} label="Chapter momentum" markerLabel="Now" />
            <QuestProgressBar value={36} label="Reflection cadence" />
          </div>
        </QuestGlassCard>

        <QuestGlassCard title="Identity cards" subtle>
          <div className="quest-preview-grid quest-preview-grid--two">
            <QuestTraitCard
              role="Dominant style"
              icon="☾"
              title="The Reflective Builder"
              summary="Turns insight into calm systems and prefers meaningful rituals over streak pressure."
              variant="dominant"
            />
            <QuestTraitCard
              role="Growth edge"
              icon="◇"
              title="Decide sooner"
              summary="Use one next best step to avoid over-planning the journey."
              variant="growth-edge"
            />
          </div>
        </QuestGlassCard>
      </div>

      <QuestHeroCard
        eyebrow="Progression · Quiet premium"
        title="Evidence of change should feel calm, not loud."
        summary="Progress rings, blue-purple gradients, and gold star accents can carry the game quest layer without turning the coaching experience childish."
        pillar="progression"
        actions={<QuestPrimaryAction variant="progress">Preview progression CTA</QuestPrimaryAction>}
        visual={<QuestMetricRing value={86} label="Momentum" caption="Mock weekly signal" variant="success" />}
      />

      <QuestModalSheet
        open={isModalOpen}
        title="QuestModalSheet preview"
        onClose={() => setIsModalOpen(false)}
        footer={
          <>
            <QuestSecondaryAction onClick={() => setIsModalOpen(false)}>Close</QuestSecondaryAction>
            <QuestPrimaryAction onClick={() => setIsModalOpen(false)}>Use this pattern</QuestPrimaryAction>
          </>
        }
      >
        <div className="quest-preview-stack">
          <p>
            This safe static modal demonstrates viewport-fixed backdrop, internal scrolling, shared glass treatment,
            Escape close behavior, and body scroll lock while open.
          </p>
          <QuestCompanionCard
            source="Modal QA"
            title="Check mobile bottom-sheet behavior."
            insight="On iPhone-sized viewports, the panel should align to the bottom, respect safe areas, and keep content scrollable."
          />
          <QuestProgressBar value={58} label="Sheet readiness" markerLabel="QA" />
        </div>
      </QuestModalSheet>
    </QuestJourneyShell>
  );
}

export default QuestJourneyVisualSystemPreview;
