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
    const { data } = await listCaseMessages(threadId);
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

        <div style={{ display: 'grid', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
          {threads.map((thread) => (
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
