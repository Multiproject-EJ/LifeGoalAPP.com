import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { listAllCaseThreads, updateCaseStatus, addInternalNote, saveReplyDraft, sendAdminReply } from '../../services/adminCases';
import { isAdminUser } from '../../services/adminRoles';
import { listCaseMessages, type CaseStatus, type CaseThreadRow, type CaseMessageRow } from '../../services/cases';

type Props = {
  session: Session;
};

const STATUS_OPTIONS: CaseStatus[] = ['new', 'triaged', 'waiting_on_user', 'resolved', 'closed'];

export function AdminInboxPanel({ session }: Props) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [threads, setThreads] = useState<CaseThreadRow[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CaseMessageRow[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | CaseStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'feedback' | 'support'>('all');
  const [featureFilter, setFeatureFilter] = useState<'all' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    isAdminUser(session.user.id).then((value) => {
      if (!active) return;
      setIsAdmin(value);
    });
    return () => {
      active = false;
    };
  }, [session.user.id]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [threads, selectedThreadId],
  );

  const getFeatureArea = (thread: CaseThreadRow): string => {
    const value = thread.metadata?.feature_area;
    return typeof value === 'string' && value.trim().length > 0 ? value : 'general';
  };

  const availableFeatureAreas = useMemo(() => {
    return Array.from(new Set(threads.map((thread) => getFeatureArea(thread)))).sort((a, b) => a.localeCompare(b));
  }, [threads]);

  const filteredThreads = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return threads.filter((thread) => {
      if (statusFilter !== 'all' && thread.status !== statusFilter) return false;
      if (typeFilter !== 'all' && thread.case_type !== typeFilter) return false;
      if (featureFilter !== 'all' && getFeatureArea(thread) !== featureFilter) return false;
      if (!search) return true;
      return (
        thread.subject.toLowerCase().includes(search) ||
        thread.category.toLowerCase().includes(search) ||
        getFeatureArea(thread).toLowerCase().includes(search) ||
        thread.id.slice(0, 8).toLowerCase().includes(search)
      );
    });
  }, [threads, statusFilter, typeFilter, featureFilter, searchQuery]);

  const loadThreads = async () => {
    setLoading(true);
    const { data, error } = await listAllCaseThreads();
    setLoading(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    setThreads(data);
    if (!selectedThreadId && data.length > 0) {
      setSelectedThreadId(data[0].id);
    }
  };

  const loadMessages = async (threadId: string) => {
    const { data, error } = await listCaseMessages(threadId);
    if (error) {
      setStatus(error.message);
      return;
    }
    setMessages(data);
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadThreads();
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedThreadId || !isAdmin) return;
    void loadMessages(selectedThreadId);
  }, [selectedThreadId, isAdmin]);

  if (isAdmin === null) {
    return <p className="account-panel__hint">Checking admin access…</p>;
  }

  if (!isAdmin) {
    return null;
  }

  const handleStatusUpdate = async (nextStatus: CaseStatus) => {
    if (!selectedThread) return;
    const { error } = await updateCaseStatus({
      threadId: selectedThread.id,
      nextStatus,
      adminUserId: session.user.id,
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus(`Status updated to ${nextStatus}.`);
    await loadThreads();
    await loadMessages(selectedThread.id);
  };

  const handleSaveInternalNote = async () => {
    if (!selectedThread || !noteDraft.trim()) return;
    const { error } = await addInternalNote({
      threadId: selectedThread.id,
      adminUserId: session.user.id,
      body: noteDraft,
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setNoteDraft('');
    setStatus('Internal note saved.');
    await loadMessages(selectedThread.id);
  };

  const handleSaveReplyDraft = async () => {
    if (!selectedThread || !replyDraft.trim()) return;
    const { error } = await saveReplyDraft({
      threadId: selectedThread.id,
      adminUserId: session.user.id,
      body: replyDraft,
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus('Manual reply draft saved. Copy and send externally.');
    await loadMessages(selectedThread.id);
  };

  const handleSendReply = async () => {
    if (!selectedThread || !replyDraft.trim()) return;
    const { error } = await sendAdminReply({
      threadId: selectedThread.id,
      adminUserId: session.user.id,
      body: replyDraft,
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setReplyDraft('');
    setStatus('Reply sent to user (in-app timeline).');
    await loadMessages(selectedThread.id);
  };

  return (
    <section className="account-panel__card" aria-labelledby="admin-inbox">
      <p className="account-panel__eyebrow">Admin</p>
      <h3 id="admin-inbox">Feedback & support inbox</h3>
      <p className="account-panel__hint">Admin-only queue for feedback and support cases.</p>
      {status ? <p className="account-panel__saving-indicator">{status}</p> : null}

      <div style={{ display: 'grid', gap: 12 }}>
        <div className="account-panel__actions-row">
          <button type="button" className="btn" onClick={loadThreads} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh inbox'}
          </button>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div className="account-panel__actions-row" style={{ flexWrap: 'wrap' }}>
            <label className="supabase-auth__field" style={{ minWidth: 180, marginBottom: 0 }}>
              <span>Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | CaseStatus)}>
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="supabase-auth__field" style={{ minWidth: 180, marginBottom: 0 }}>
              <span>Case type</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | 'feedback' | 'support')}>
                <option value="all">All case types</option>
                <option value="feedback">feedback</option>
                <option value="support">support</option>
              </select>
            </label>

            <label className="supabase-auth__field" style={{ minWidth: 200, marginBottom: 0 }}>
              <span>Feature area</span>
              <select value={featureFilter} onChange={(event) => setFeatureFilter(event.target.value)}>
                <option value="all">All feature areas</option>
                {availableFeatureAreas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="account-panel__actions-row" style={{ flexWrap: 'wrap' }}>
            <label className="supabase-auth__field" style={{ minWidth: 260, marginBottom: 0, flex: '1 1 260px' }}>
              <span>Search</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Subject, category, feature area, or ref…"
              />
            </label>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('all');
                setFeatureFilter('all');
                setSearchQuery('');
              }}
            >
              Clear filters
            </button>
          </div>
          <p className="account-panel__hint" style={{ margin: 0 }}>
            Showing {filteredThreads.length} of {threads.length} cases.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
          {filteredThreads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className={`btn ${selectedThreadId === thread.id ? 'btn--primary' : ''}`}
              onClick={() => setSelectedThreadId(thread.id)}
              style={{ justifyContent: 'space-between' }}
            >
              <span>{thread.case_type} · {thread.category} · {getFeatureArea(thread)}</span>
              <span>{thread.status}</span>
            </button>
          ))}
          {threads.length === 0 ? <p className="account-panel__hint">No cases yet.</p> : null}
          {threads.length > 0 && filteredThreads.length === 0 ? <p className="account-panel__hint">No cases match current filters.</p> : null}
        </div>

        {selectedThread ? (
          <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 12 }}>
            <h4>{selectedThread.subject}</h4>
            <p className="account-panel__hint">Feature area: {getFeatureArea(selectedThread)}</p>
            <p className="account-panel__hint">Desired outcome: {selectedThread.desired_outcome || 'Not provided'}</p>
            <div className="account-panel__actions-row" style={{ flexWrap: 'wrap' }}>
              {STATUS_OPTIONS.map((option) => (
                <button key={option} type="button" className="btn" onClick={() => handleStatusUpdate(option)}>
                  {option}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 10, display: 'grid', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
              {messages.map((message) => (
                <div key={message.id} className="account-panel__card" style={{ margin: 0 }}>
                  <p className="account-panel__eyebrow">{message.author_role} · {message.message_type}</p>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.body}</p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10 }}>
              <label className="supabase-auth__field">
                <span>Internal note</span>
                <textarea rows={3} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
              </label>
              <button type="button" className="btn" onClick={handleSaveInternalNote}>Save internal note</button>
            </div>

            <div style={{ marginTop: 10 }}>
              <label className="supabase-auth__field">
                <span>Reply to user (visible to user)</span>
                <textarea rows={4} value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} />
              </label>
              <div className="account-panel__actions-row">
                <button type="button" className="btn btn--primary" onClick={handleSendReply}>Send reply</button>
                <button type="button" className="btn" onClick={handleSaveReplyDraft}>Save private draft</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
