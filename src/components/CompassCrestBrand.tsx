import './CompassCrestBrand.css';

interface CompassCrestBrandProps {
  className?: string;
  headingId?: string;
  rank?: number;
  surface?: 'light' | 'dark';
  asHeading?: boolean;
  animated?: boolean;
  curved?: boolean;
  variant?: 'compass' | 'shield';
}

export function CompassCrestBrand({
  className = '',
  headingId,
  rank,
  surface = 'light',
  asHeading = false,
  animated = false,
  curved = false,
  variant = 'compass',
}: CompassCrestBrandProps) {
  const classes = [
    'compass-crest-brand',
    `compass-crest-brand--${surface}`,
    `compass-crest-brand--${variant}`,
    animated ? 'compass-crest-brand--animated' : '',
    curved ? 'compass-crest-brand--curved' : '',
    className,
  ].filter(Boolean).join(' ');

  const wordmarkLetters = 'HabitGame'.split('').map((letter, index) => (
    <span
      // Letter positions are stable and intentionally control the shallow arch.
      // eslint-disable-next-line react/no-array-index-key
      key={`${letter}-${index}`}
      className="compass-crest-brand__letter"
      aria-hidden="true"
    >
      {letter}
    </span>
  ));

  const wordmark = asHeading ? (
    <h1
      className="compass-crest-brand__wordmark"
      id={headingId}
      aria-label="HabitGame"
    >
      {curved ? wordmarkLetters : 'HabitGame'}
    </h1>
  ) : (
    <div
      className="compass-crest-brand__wordmark"
      id={headingId}
      aria-label="HabitGame"
    >
      {curved ? wordmarkLetters : 'HabitGame'}
    </div>
  );

  return (
    <div className={classes}>
      {variant === 'shield' ? (
        <div className="compass-crest-brand__shield-lockup">
          <img
            className="compass-crest-brand__shield"
            src="/assets/brand/habitgame-shield-compass.webp"
            alt=""
            width="640"
            height="640"
            decoding="async"
          />
          {wordmark}
          {typeof rank === 'number' ? (
            <span className="compass-crest-brand__rank-plaque">
              Rank {rank}
            </span>
          ) : null}
        </div>
      ) : (
        <>
          <div className="compass-crest-brand__crest" aria-hidden="true">
            <img
              src="/assets/brand/habitgame-compass-crest-rankless.webp"
              alt=""
              width="640"
              height="640"
              decoding="async"
            />
            <span className="compass-crest-brand__rank-value">{rank ?? '✦'}</span>
            {typeof rank === 'number' ? (
              <span className="compass-crest-brand__rank-label">Rank</span>
            ) : null}
          </div>

          {wordmark}
        </>
      )}

      <span className="compass-crest-brand__rule" aria-hidden="true">
        <span />
      </span>
    </div>
  );
}
