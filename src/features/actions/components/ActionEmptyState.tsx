export function ActionEmptyState() {
  return (
    <div className="actions-tab__empty-state">
      <span className="actions-tab__empty-icon" aria-hidden="true">⚡️</span>
      <p className="actions-tab__empty-text">
        No actions yet!
      </p>
      <p className="actions-tab__empty-hint">
        Add your first task above to get started.<br />
        <strong>MUST DO</strong> items stay until complete.<br />
        <strong>NICE TO DO</strong> auto-deletes after 3 days.<br />
        <strong>PROJECT</strong> items migrate to Projects after 3 days.
      </p>
    </div>
  );
}
