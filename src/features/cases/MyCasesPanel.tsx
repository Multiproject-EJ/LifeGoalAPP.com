import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { addUserCaseReply, listCaseMessages, listMyCaseThreads, type CaseMessageRow, type CaseThreadRow } from '../../services/cases';
import { listMyCaseThreadReads, markCaseThreadRead } from '../../services/caseThreadReads';

type Props = {
  session: Session;
};

const USER_VISIBLE_MESSAGE_TYPES = new Set<CaseMessageRow['message_type']>([
  'submission',
  'user_reply',
  'admin_reply',
  'status_change',
]);

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function MyCasesPanel({ session }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [threads, setThreads] = useState<CaseThreadRow[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CaseMessageRow[]>([]);
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [readByThreadId, setReadByThreadId] = useState<Record<string, string>>({});

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [threads, selectedThreadId],
  );

  const loadThreads = async () => {
    setLoading(true);
    const { data, error } = await listMyCaseThreads(session.user.id);
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
    setMessages(data.filter((message) => USER_VISIBLE_MESSAGE_TYPES.has(message.message_type)));
  };

  useEffect(() => {
    void loadThreads();
  }, []);

  useEffect(() => {
    listMyCaseThreadReads({ userId: session.user.id, role: 'user' }).then(({ data, error }) => {
      if (error) {
        setStatus(error.message);
        return;
      }
      const next: Record<string, string> = {};
      data.forEach((readRow) => {
        next[readRow.thread_id] = readRow.last_read_at;
      });
      setReadByThreadId(next);
    });
  }, [session.user.id]);

  useEffect(() => {
    if (!selectedThreadId) return;
    void loadMessages(selectedThreadId);
    markCaseThreadRead({
      threadId: selectedThreadId,
      userId: session.user.id,
      role: 'user',
    }).then(({ data }) => {
      if (!data) return;
      setReadByThreadId((current) => ({ ...current, [selectedThreadId]: data.last_read_at }));
    });
  }, [selectedThreadId]);

  const handleSendReply = async () => {
    if (!selectedThread || !replyBody.trim()) return;
    setSendingReply(true);
    const { error } = await addUserCaseReply({
      threadId: selectedThread.id,
      userId: session.user.id,
      body: replyBody,
    });
    setSendingReply(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    setReplyBody('');
    setStatus('Reply sent.');
    await loadMessages(selectedThread.id);
  };

  return (
    <section className="account-panel__card" aria-labelledby="my-cases-panel">
      <p className="account-panel__eyebrow">Support timeline</p>
      <h3 id="my-cases-panel">My feedback &amp; support requests</h3>
      <p className="account-panel__hint">
        Track your requests, view replies, and send follow-up details without creating a duplicate case.
      </p>
      {status ? <p className="account-panel__saving-indicator">{status}</p> : null}

      <div className="account-panel__actions-row">
        <button type="button" className="btn" onClick={loadThreads} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh requests'}
        </button>
      </div>

      {threads.length === 0 ? (
        <p className="account-panel__hint" style={{ marginTop: '0.75rem' }}>No requests yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          <div style={{ display: 'grid', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                    className={`btn ${selectedThreadId === thread.id ? 'btn--primary' : ''}`}
                    onClick={() => setSelectedThreadId(thread.id)}
                    style={{ justifyContent: 'space-between' }}
                  >
                    <span>{thread.case_type} · {thread.category}</span>
                    <span>{thread.status}</span>
                    {new Date(thread.updated_at).getTime() > new Date(readByThreadId[thread.id] ?? 0).getTime() ? (
                      <span className="account-panel__saving-indicator">New</span>
                    ) : null}
                  </button>
                ))}
          </div>

          {selectedThread ? (
            <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 12 }}>
              <h4>{selectedThread.subject}</h4>
              <p className="account-panel__hint">Opened: {formatDateTime(selectedThread.created_at)}</p>
              <div style={{ display: 'grid', gap: 8, maxHeight: 220, overflowY: 'auto', marginTop: 8 }}>
                {messages.map((message) => (
                  <div key={message.id} className="account-panel__card" style={{ margin: 0 }}>
                    <p className="account-panel__eyebrow">
                      {message.author_role} · {message.message_type} · {formatDateTime(message.created_at)}
                    </p>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.body}</p>
                  </div>
                ))}
                {messages.length === 0 ? <p className="account-panel__hint">No visible updates yet.</p> : null}
              </div>

              <label className="supabase-auth__field" style={{ marginTop: 10 }}>
                <span>Add follow-up details</span>
                <textarea
                  rows={3}
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  placeholder="Share any extra context, screenshots notes, or confirmation details."
                />
              </label>
              <div className="account-panel__actions-row">
                <button type="button" className="btn btn--primary" onClick={handleSendReply} disabled={sendingReply || !replyBody.trim()}>
                  {sendingReply ? 'Sending…' : 'Send follow-up'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
