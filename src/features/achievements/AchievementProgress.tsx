type Props = {
  current: number;
  required: number;
  percent: number;
};

export function AchievementProgress({ current, required, percent }: Props) {
  return (
    <div className="achievement-progress">
      <div className="achievement-progress__bar">
        <div
          className="achievement-progress__fill"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <p className="achievement-progress__text">
        {current}/{required}
      </p>
    </div>
  );
}
