import { FeatureStatusBadge } from './FeatureStatusBadge';
import {
  getFeatureAvailability,
  type FeatureAvailability,
  type FeatureAvailabilityId,
} from '../config/featureAvailability';

type SettingsFeatureCardActorContext = {
  isAdminOrCreator?: boolean;
};

type SettingsFeatureCardProps = {
  icon: string;
  title: string;
  featureId?: FeatureAvailabilityId;
  actorContext?: SettingsFeatureCardActorContext;
  onClick: () => void;
};

function getActorAwareStatusLabel(
  feature: FeatureAvailability,
  actorContext?: SettingsFeatureCardActorContext,
) {
  if (!actorContext?.isAdminOrCreator) return undefined;

  return feature.adminLabel ?? feature.publicLabel;
}

export function SettingsFeatureCard({
  icon,
  title,
  featureId,
  actorContext,
  onClick,
}: SettingsFeatureCardProps) {
  const feature = featureId ? getFeatureAvailability(featureId) : null;
  const statusLabelOverride = feature ? getActorAwareStatusLabel(feature, actorContext) : undefined;
  const shouldMuteIcon = feature?.status === 'demo' && featureId !== 'settings.experimentalFeatures';

  return (
    <button
      type="button"
      className={`settings-module-card${shouldMuteIcon ? ' future-feature-card--demo' : ''}`}
      onClick={onClick}
      aria-label={`Open ${title}`}
    >
      <span className="settings-module-card__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="settings-module-card__content">
        <span className="settings-module-card__title-row">
          <span className="settings-module-card__title">{title}</span>
          {feature ? (
            <FeatureStatusBadge
              status={feature.status}
              labelOverride={statusLabelOverride}
              className="settings-module-card__badge"
            />
          ) : null}
        </span>
      </span>
    </button>
  );
}
