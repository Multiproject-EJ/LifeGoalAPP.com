import { useEffect } from 'react';
import { TodayPet } from './TodayPet';

/**
 * Development-only preview: /dev/today-pet-preview?creature=common-sproutling&bond=4&fed=0&open=1
 * (open=1 taps the pet so the stats card and bubbles show for captures).
 */
export default function TodayPetPreview() {
  const params = new URLSearchParams(window.location.search);
  const creatureId = params.get('creature') ?? 'common-sproutling';
  const bondLevel = Number(params.get('bond')) || 1;
  const fedToday = params.get('fed') === '1';
  useEffect(() => {
    if (params.get('open') !== '1') return undefined;
    const timer = window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>('.today-pet__body')?.click();
    }, 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(#e0f2fe, #f8fafc)', paddingTop: 240 }}>
      <p style={{ textAlign: 'center', font: '600 14px system-ui' }}>Today pet preview</p>
      <TodayPet
        companion={{ creatureId, paired: params.get('paired') !== '0', bondLevel }}
        fedToday={fedToday}
        feeding={false}
        onFeed={() => undefined}
        onPair={() => undefined}
      />
    </div>
  );
}
