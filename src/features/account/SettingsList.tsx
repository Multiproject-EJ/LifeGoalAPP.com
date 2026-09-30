import type { ReactNode } from 'react';
import './settingsList.css';

/** A titled group of settings rows, drawn as one rounded card. */
export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="settings-list__section" aria-label={title}>
      {title ? <h3 className="settings-list__title">{title}</h3> : null}
      <div className="settings-list__group">{children}</div>
    </section>
  );
}

type SettingsRowProps = {
  icon?: string;
  /** Soft tint behind the icon: one of the palette names in settingsList.css. */
  tone?: 'blue' | 'gold' | 'pink' | 'green' | 'purple' | 'gray' | 'orange';
  title: ReactNode;
  subtitle?: ReactNode;
  /** Short current value shown on the right, e.g. "On" or "Bio Day". */
  value?: ReactNode;
  /** Opens a detail screen; the row becomes a button with a chevron. */
  onClick?: () => void;
  /** An inline control (switch, segmented buttons) shown on the right. */
  control?: ReactNode;
  danger?: boolean;
};

export function SettingsRow({ icon, tone = 'gray', title, subtitle, value, onClick, control, danger }: SettingsRowProps) {
  const body = (
    <>
      {icon ? (
        <span className={`settings-list__icon settings-list__icon--${tone}`} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="settings-list__text">
        <span className="settings-list__row-title">{title}</span>
        {subtitle ? <span className="settings-list__row-subtitle">{subtitle}</span> : null}
      </span>
      {value !== undefined && value !== null ? <span className="settings-list__value">{value}</span> : null}
      {control}
      {onClick ? <span className="settings-list__chevron" aria-hidden="true">›</span> : null}
    </>
  );

  const className = `settings-list__row${danger ? ' settings-list__row--danger' : ''}`;
  return onClick ? (
    <button type="button" className={`${className} settings-list__row--button`} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function SettingsSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`settings-list__switch${checked ? ' settings-list__switch--on' : ''}`}
      onClick={() => onChange(!checked)}
    />
  );
}

export function SettingsSegmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div className="settings-list__segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={`settings-list__segment${option.value === value ? ' settings-list__segment--on' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
