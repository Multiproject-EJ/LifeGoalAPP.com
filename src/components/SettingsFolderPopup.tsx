import { ReactNode, useEffect, useRef } from 'react';

type SettingsFolderPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function SettingsFolderPopup({ isOpen, onClose, title, children }: SettingsFolderPopupProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    const handleClose = () => {
      onClose();
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <dialog ref={dialogRef} className="settings-folder-popup" aria-labelledby="popup-title">
      <div className="settings-folder-popup__header">
        <h2 id="popup-title" className="settings-folder-popup__title">
          {title}
        </h2>
        <button
          type="button"
          className="settings-folder-popup__close"
          onClick={onClose}
          aria-label="Close settings folder"
        >
          ✕
        </button>
      </div>
      <div className="settings-folder-popup__content">{children}</div>
    </dialog>
  );
}
