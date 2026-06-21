import { useCallback, useEffect, useState } from 'react';
import './compassBook.css';
import type { CompassBookChapterId } from '../types';
import { CompassBookContents } from './CompassBookContents';
import { CompassChapterScreen } from './CompassChapterScreen';

export type CompassBookScreenProps = {
  /** Current Island Run island (read-only); drives which fragments are unlocked. */
  currentIslandNumber: number;
  onClose: () => void;
};

type CompassBookView = { kind: 'contents' } | { kind: 'chapter'; chapterId: CompassBookChapterId };

/**
 * Full-screen Player Menu entry point for the Compass Book (PR 2 shell).
 *
 * Owns navigation between the table of contents and a single chapter detail.
 * It never reads or mutates Island Run state beyond the island number passed in,
 * and is entirely separate from Quest Pulse and the legacy Compass.
 */
export function CompassBookScreen({ currentIslandNumber, onClose }: CompassBookScreenProps) {
  const [view, setView] = useState<CompassBookView>({ kind: 'contents' });

  const backToContents = useCallback(() => setView({ kind: 'contents' }), []);
  const openChapter = useCallback(
    (chapterId: CompassBookChapterId) => setView({ kind: 'chapter', chapterId }),
    [],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (view.kind === 'chapter') {
        backToContents();
      } else {
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, backToContents, onClose]);

  return (
    <div className="compass-book" role="dialog" aria-modal="true" aria-label="Compass Book">
      <div className="compass-book__backdrop" aria-hidden="true" onClick={onClose} />
      <div className="compass-book__sheet">
        {view.kind === 'contents' ? (
          <CompassBookContents
            currentIslandNumber={currentIslandNumber}
            onClose={onClose}
            onOpenChapter={openChapter}
          />
        ) : (
          <CompassChapterScreen
            chapterId={view.chapterId}
            currentIslandNumber={currentIslandNumber}
            onBack={backToContents}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
