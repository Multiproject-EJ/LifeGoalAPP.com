type AgreementCloseCardProps = {
  summaryItems: string[];
  followUpDate: string;
  onFollowUpDateChange: (value: string) => void;
  onFinalize: () => void;
};

export function AgreementCloseCard({
  summaryItems,
  followUpDate,
  onFollowUpDateChange,
  onFinalize,
}: AgreementCloseCardProps) {
  return (
    <section className="conflict-resolver__agreement-card" aria-labelledby="agreement-close-title">
      <header className="conflict-resolver__header">
        <h3 id="agreement-close-title" className="conflict-resolver__title">Agreement close</h3>
        <p className="conflict-resolver__subtitle">Capture what both sides agreed and schedule a follow-up check-in.</p>
      </header>

      <ul className="conflict-resolver__agreement-list">
        {summaryItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <label htmlFor="agreement-follow-up" className="conflict-resolver__prompt-label">Follow-up date</label>
      <input
        id="agreement-follow-up"
        type="date"
        className="conflict-resolver__date-input"
        value={followUpDate}
        onChange={(event) => onFollowUpDateChange(event.target.value)}
      />

      <button type="button" className="btn btn--primary conflict-resolver__primary-cta" onClick={onFinalize}>
        Finalize agreement
      </button>
    </section>
  );
}
