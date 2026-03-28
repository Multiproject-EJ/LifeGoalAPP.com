type AgreementCloseCardProps = {
  summaryItems: string[];
  followUpDate: string;
  onFollowUpDateChange: (value: string) => void;
  inviteeEmailDraft: string;
  onInviteeEmailDraftChange: (value: string) => void;
  inviteeEmailError: string | null;
  lightweightParticipants: string[];
  onAddLightweightParticipant: () => void;
  onRemoveLightweightParticipant: (email: string) => void;
  canFinalize: boolean;
  finalizeHint?: string;
  onFinalize: () => void;
};

export function AgreementCloseCard({
  summaryItems,
  followUpDate,
  onFollowUpDateChange,
  inviteeEmailDraft,
  onInviteeEmailDraftChange,
  inviteeEmailError,
  lightweightParticipants,
  onAddLightweightParticipant,
  onRemoveLightweightParticipant,
  canFinalize,
  finalizeHint,
  onFinalize,
}: AgreementCloseCardProps) {
  const handleInviteSubmit = () => {
    onAddLightweightParticipant();
  };

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

      <div className="conflict-resolver__invite-block" aria-label="Invite participants to agreement">
        <label htmlFor="agreement-invite-email" className="conflict-resolver__prompt-label">Invite participants</label>
        <div className="conflict-resolver__invite-row">
          <input
            id="agreement-invite-email"
            type="email"
            className="conflict-resolver__text-input"
            placeholder="name@example.com"
            value={inviteeEmailDraft}
            onChange={(event) => onInviteeEmailDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleInviteSubmit();
              }
            }}
          />
          <button type="button" className="btn" onClick={handleInviteSubmit}>
            Add
          </button>
        </div>
        {inviteeEmailError && (
          <p className="conflict-resolver__input-error" role="alert">
            {inviteeEmailError}
          </p>
        )}

        {lightweightParticipants.length > 0 && (
          <ul className="conflict-resolver__invite-list">
            {lightweightParticipants.map((email) => (
              <li key={email} className="conflict-resolver__invite-item">
                <span>{email}</span>
                <button type="button" className="btn" onClick={() => onRemoveLightweightParticipant(email)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {finalizeHint ? <p className="conflict-resolver__input-error">{finalizeHint}</p> : null}
      <button
        type="button"
        className="btn btn--primary conflict-resolver__primary-cta"
        onClick={onFinalize}
        disabled={!canFinalize}
      >
        Finalize agreement
      </button>
    </section>
  );
}
