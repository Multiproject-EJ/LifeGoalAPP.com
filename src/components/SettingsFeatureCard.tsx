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
  subtitle: string;
  meta: string;
  featureId?: FeatureAvailabilityId;
  actorContext?: SettingsFeatureCardActorContext;
  onClick: () => void;
};

function getActorAwareStatusLabel(
  feature: FeatureAvailability,
  actorContext?: SettingsFeatureCardActorContext,
) {
  if (!actorContext) return undefined;

  return actorContext.isAdminOrCreator
    ? feature.adminLabel ?? feature.publicLabel
    : feature.publicLabel;
}

export function SettingsFeatureCard({
  icon,
  title,
  subtitle,
  meta,
  featureId,
  actorContext,
  onClick,
}: SettingsFeatureCardProps) {
  const feature = featureId ? getFeatureAvailability(featureId) : null;
  const statusLabelOverride = feature ? getActorAwareStatusLabel(feature, actorContext) : undefined;

  return (
    <button
      type="button"
      className="settings-module-card"
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
        <span className="settings-module-card__subtitle">{subtitle}</span>
        <span className="settings-module-card__meta">{meta}</span>
      </span>
    </button>
  );
}

export const SettingsModuleButton = SettingsFeatureCard;
