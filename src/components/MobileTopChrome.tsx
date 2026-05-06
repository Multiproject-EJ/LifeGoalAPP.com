import { getTopDisplayClass, type TopDisplayClass } from '../utils/topDisplayClass';

type MobileTopChromeProps = {
  deviceClass?: TopDisplayClass | null;
};

export function MobileTopChrome({ deviceClass: providedDeviceClass }: MobileTopChromeProps) {
  const deviceClass = providedDeviceClass ?? getTopDisplayClass();

  if (!deviceClass) {
    return null;
  }

  return (
    <div className={`mobile-top-chrome mobile-top-chrome--${deviceClass}`} aria-hidden="true">
      <span className="mobile-top-chrome__wash" />
    </div>
  );
}
