import type { AppSurface } from '../../surfaces/surfaceContext';
import { ConflictResolverExperience } from './ConflictResolverExperience';
import { getConflictSurfaceConfig } from './conflictSurfaceConfig';

type ConflictResolverEntryProps = {
  surface: AppSurface;
};

export function ConflictResolverEntry({ surface }: ConflictResolverEntryProps) {
  const config = getConflictSurfaceConfig(surface);

  return (
    <section
      className="conflict-resolver-entry"
      data-conflict-surface={config.surface}
      data-conflict-product={config.productLabel}
    >
      <ConflictResolverExperience surface={config.surface} />
    </section>
  );
}
