type SettingsFolderButtonProps = {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
  itemCount: number;
};

export function SettingsFolderButton({
  title,
  description,
  icon,
  onClick,
  itemCount,
}: SettingsFolderButtonProps) {
  return (
    <button
      type="button"
      className="settings-folder-button"
      onClick={onClick}
      aria-label={`Open ${title} folder with ${itemCount} settings`}
    >
      <div className="settings-folder-button__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="settings-folder-button__content">
        <h3 className="settings-folder-button__title">{title}</h3>
        <p className="settings-folder-button__description">{description}</p>
        <p className="settings-folder-button__count">{itemCount} settings</p>
      </div>
      <div className="settings-folder-button__arrow" aria-hidden="true">
        →
      </div>
    </button>
  );
}
