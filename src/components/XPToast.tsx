import { useEffect, useState } from 'react';
import './XPToast.css';

type Props = {
  amount: number;
  source?: string;
  celebration?: string;
  onComplete?: () => void;
};

export function XPToast({ amount, source, celebration, onComplete }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 300); // Wait for fade out
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`xp-toast ${visible ? 'xp-toast--visible' : 'xp-toast--hidden'}`}>
      <span className="xp-toast__icon">✨</span>
      <span className="xp-toast__amount">+{amount} XP</span>
      {celebration && (
        <span className="xp-toast__celebration" aria-label="Level up celebration">
          {celebration}
        </span>
      )}
      {source && <span className="xp-toast__source">{source}</span>}
    </div>
  );
}
