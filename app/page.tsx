'use client';

import { useEffect, useMemo, useState } from 'react';
import { LuCalendarClock, LuFilePlus2, LuShieldAlert, LuTrash2, LuWifiOff } from 'react-icons/lu';
import { localDatabase } from '@/client-db';
import {
  createDocumentRecord,
  EMPTY_DOCUMENT_DRAFT,
  getExpiryStatus,
  validateDocumentDraft,
  type DocumentDraft,
  type DocumentDraftErrors,
  type DocumentRecord,
  type ExpiryStatus,
} from '@/document-record';
import { projectInfo } from '@/project-info';

const expiryLabels: Record<ExpiryStatus, string> = {
  'no-expiry': 'No expiry date',
  expired: 'Expired',
  'due-today': 'Expires today',
  'due-soon': 'Expires within 30 days',
  upcoming: 'Upcoming',
};

function formatDate(value: string): string {
  if (!value) return '';
  return new Intl.DateTimeFormat(projectInfo.locale, { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00.000Z`));
}

function expiryClasses(status: ExpiryStatus): string {
  if (status === 'expired') return 'bg-rose-100 text-rose-800';
  if (status === 'due-today' || status === 'due-soon') return 'bg-amber-100 text-amber-900';
  return 'bg-slate-100 text-slate-700';
}

export default function HomePage() {
  const [draft, setDraft] = useState<DocumentDraft>(EMPTY_DOCUMENT_DRAFT);
  const [records, setRecords] = useState<DocumentRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [hasInteracted, setHasInteracted] = useState(false);
  const [draftState, setDraftState] = useState<'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>('idle');
  const [storageError, setStorageError] = useState('');
  const [recordMessage, setRecordMessage] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([localDatabase.documents.toArray(), localDatabase.documentDrafts.get('current')])
      .then(([savedRecords, savedDraft]) => {
        if (!active) return;
        setRecords(savedRecords.sort((a, b) => (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31')));
        if (savedDraft) {
          setDraft(savedDraft.draft);
          setHasInteracted(true);
          setDraftState('saved');
        }
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setStorageError('This browser could not open local storage. Your entries have not been saved.');
        setReady(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready || !hasInteracted || storageError) return;
    const timeout = window.setTimeout(() => {
      setDraftState('saving');
      void localDatabase.documentDrafts.put({ id: 'current', draft, updatedAt: Date.now() })
        .then(() => setDraftState('saved'))
        .catch(() => {
          setDraftState('error');
          setStorageError('The draft could not be saved on this device.');
        });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [draft, hasInteracted, ready, storageError]);

  const errors = useMemo<DocumentDraftErrors>(() => today ? validateDocumentDraft(draft, today) : {}, [draft, today]);
  const valid = Object.keys(errors).length === 0;

  function updateDraft(field: keyof DocumentDraft, value: string) {
    setDraft(current => ({ ...current, [field]: value }));
    setHasInteracted(true);
    setDraftState('unsaved');
    setRecordMessage('');
  }

  async function saveRecord() {
    setReviewOpen(true);
    if (!valid) {
      setRecordMessage('Fix the highlighted fields before saving this record.');
      return;
    }
    setBusy(true);
    setStorageError('');
    try {
      const record = createDocumentRecord(draft, crypto.randomUUID(), Date.now());
      const savedRecords = await localDatabase.transaction('rw', localDatabase.documents, localDatabase.documentDrafts, async () => {
        await localDatabase.documents.add(record);
        await localDatabase.documentDrafts.delete('current');
        return localDatabase.documents.toArray();
      });
      setRecords(savedRecords.sort((a, b) => (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31')));
      setDraft(EMPTY_DOCUMENT_DRAFT);
      setHasInteracted(false);
      setDraftState('idle');
      setReviewOpen(false);
      setRecordMessage('Saved on this device. Server sync is not available yet.');
    } catch {
      setStorageError('The record could not be saved. Your draft is still available; try again.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteRecord(record: DocumentRecord) {
    if (!window.confirm(`Delete “${record.title}” from this device? This cannot be undone.`)) return;
    try {
      await localDatabase.documents.delete(record.id);
      setRecords(current => current.filter(item => item.id !== record.id));
      setRecordMessage(`“${record.title}” was deleted from this device.`);
    } catch {
      setStorageError('The record could not be deleted.');
    }
  }

  async function clearDraft() {
    if (!window.confirm('Clear the saved draft from this device?')) return;
    try {
      await localDatabase.documentDrafts.delete('current');
      setDraft(EMPTY_DOCUMENT_DRAFT);
      setHasInteracted(false);
      setDraftState('idle');
      setReviewOpen(false);
      setRecordMessage('The saved draft was cleared from this device.');
    } catch {
      setStorageError('The saved draft could not be cleared.');
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
          <a className="font-semibold text-sky-900" href="https://github.com/danyallya/life-admin-vault">{projectInfo.title}</a>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-900">Local document register</span>
        </header>

        <section className="py-8 sm:py-12">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-sky-800">Private household records · metadata only</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">Keep important dates in view</h1>
            <p className="mt-4 max-w-2xl leading-7 text-slate-600">Create a local register entry and review its dates before saving. This register stores details about a document; it does not store document files.</p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <article className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4" role="note">
              <LuShieldAlert className="mt-0.5 shrink-0 text-amber-800" aria-hidden="true" />
              <div><h2 className="font-semibold text-amber-950">Use limited details</h2><p className="mt-1 text-sm leading-6 text-amber-950">Encryption and device recovery are not available. Avoid sensitive notes and shared devices.</p></div>
            </article>
            <article className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4" role="note">
              <LuWifiOff className="mt-0.5 shrink-0 text-slate-600" aria-hidden="true" />
              <div><h2 className="font-semibold">Stored on this device</h2><p className="mt-1 text-sm leading-6 text-slate-600">No server sync, backup or notification is active. Expiry status appears in this register.</p></div>
            </article>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <LuFilePlus2 className="mt-1 text-sky-800" aria-hidden="true" />
              <div><h2 className="text-xl font-semibold">Add a document record</h2><p className="mt-1 text-sm text-slate-600">A name and type are required. Dates and issuer are optional.</p></div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={event => { event.preventDefault(); void saveRecord(); }}>
              <div>
                <label className="block text-sm font-medium" htmlFor="document-title">Document name <span aria-hidden="true">*</span></label>
                <input id="document-title" value={draft.title} onChange={event => updateDraft('title', event.target.value)} maxLength={120} required aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'title-error' : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200" placeholder="For example, passport" />
                {errors.title && <p className="mt-1 text-sm text-rose-700" id="title-error">{errors.title}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium" htmlFor="document-category">Document type <span aria-hidden="true">*</span></label>
                <input id="document-category" value={draft.category} onChange={event => updateDraft('category', event.target.value)} maxLength={80} required aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'category-error' : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200" placeholder="For example, identity" />
                {errors.category && <p className="mt-1 text-sm text-rose-700" id="category-error">{errors.category}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium" htmlFor="document-issuer">Issuer <span className="font-normal text-slate-500">(optional)</span></label>
                <input id="document-issuer" value={draft.issuer} onChange={event => updateDraft('issuer', event.target.value)} maxLength={120} aria-invalid={Boolean(errors.issuer)} aria-describedby={errors.issuer ? 'issuer-error' : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200" />
                {errors.issuer && <p className="mt-1 text-sm text-rose-700" id="issuer-error">{errors.issuer}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium" htmlFor="issue-date">Issue date <span className="font-normal text-slate-500">(optional)</span></label>
                  <input id="issue-date" type="date" value={draft.issueDate} onChange={event => updateDraft('issueDate', event.target.value)} aria-invalid={Boolean(errors.issueDate)} aria-describedby={errors.issueDate ? 'issue-error' : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200" />
                  {errors.issueDate && <p className="mt-1 text-sm text-rose-700" id="issue-error">{errors.issueDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium" htmlFor="expiry-date">Expiry date <span className="font-normal text-slate-500">(optional)</span></label>
                  <input id="expiry-date" type="date" value={draft.expiryDate} onChange={event => updateDraft('expiryDate', event.target.value)} aria-invalid={Boolean(errors.expiryDate)} aria-describedby={errors.expiryDate ? 'expiry-error' : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200" />
                  {errors.expiryDate && <p className="mt-1 text-sm text-rose-700" id="expiry-error">{errors.expiryDate}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium" htmlFor="document-notes">Notes <span className="font-normal text-slate-500">(optional; avoid sensitive details)</span></label>
                <textarea id="document-notes" value={draft.notes} onChange={event => updateDraft('notes', event.target.value)} maxLength={500} rows={3} aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'notes-error' : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200" />
                {errors.notes && <p className="mt-1 text-sm text-rose-700" id="notes-error">{errors.notes}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => { setReviewOpen(true); setRecordMessage(valid ? '' : 'Review the highlighted fields before saving.'); }} disabled={!ready || Boolean(storageError)} className="rounded-lg bg-sky-800 px-4 py-2.5 font-medium text-white hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50">Review record</button>
                {hasInteracted && <button type="button" onClick={() => void clearDraft()} className="rounded-lg px-3 py-2.5 text-sm text-slate-700 underline underline-offset-2">Clear draft</button>}
                <span className="text-sm text-slate-600" aria-live="polite">
                  {!ready ? 'Loading this device…' : storageError ? 'Storage error' : draftState === 'saving' ? 'Saving draft…' : draftState === 'saved' ? 'Draft saved on this device' : draftState === 'unsaved' ? 'Unsaved changes' : 'Draft not started'}
                </span>
              </div>
            </form>

            {reviewOpen && <section className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4" aria-labelledby="review-title">
              <h3 className="font-semibold" id="review-title">Review before saving</h3>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-600">Name</dt><dd className="font-medium">{draft.title.trim() || 'Not entered'}</dd></div>
                <div><dt className="text-slate-600">Type</dt><dd className="font-medium">{draft.category.trim() || 'Not entered'}</dd></div>
                <div><dt className="text-slate-600">Issue date</dt><dd className="font-medium">{formatDate(draft.issueDate) || 'Not set'}</dd></div>
                <div><dt className="text-slate-600">Expiry date</dt><dd className="font-medium">{formatDate(draft.expiryDate) || 'Not set'}</dd></div>
              </dl>
              {!valid && <p className="mt-3 text-sm text-rose-800">Resolve the validation errors above before saving.</p>}
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={() => void saveRecord()} disabled={!valid || busy || !ready || Boolean(storageError)} className="rounded-lg bg-sky-800 px-4 py-2.5 font-medium text-white hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Saving…' : 'Save on this device'}</button>
                <button type="button" onClick={() => setReviewOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium">Keep editing</button>
              </div>
            </section>}
            {recordMessage && <p className="mt-4 text-sm text-sky-900" role="status" aria-live="polite">{recordMessage}</p>}
            {storageError && <p className="mt-4 text-sm text-rose-800" role="alert">{storageError}</p>}
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2"><LuCalendarClock className="text-sky-800" aria-hidden="true" /><h2 className="text-xl font-semibold">Your register</h2></div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Expiry labels are based on today and update when you open this page. They do not send notifications.</p>
            {storageError && records.length === 0 ? <p className="mt-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-800">Local storage is unavailable, so saved records cannot be shown.</p> : records.length === 0 ? <p className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No records yet. Your first saved entry will appear here.</p> : <ul className="mt-5 space-y-3">
              {records.map(record => {
                const status = today ? getExpiryStatus(record.expiryDate, today) : 'no-expiry';
                return <li key={record.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h3 className="break-words font-semibold">{record.title}</h3><p className="mt-1 text-sm text-slate-600">{record.category}{record.issuer ? ` · ${record.issuer}` : ''}</p></div>
                    <button type="button" onClick={() => void deleteRecord(record)} aria-label={`Delete ${record.title}`} className="rounded-md p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-300"><LuTrash2 aria-hidden="true" /></button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${expiryClasses(status)}`}>{expiryLabels[status]}</span>
                    {record.expiryDate && <span className="text-slate-600">{formatDate(record.expiryDate)}</span>}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Local only · not synced</p>
                </li>;
              })}
            </ul>}
            <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Entries remain in this browser until you delete them or clear this site’s browser data. There is no recovery if the browser data or device is lost.</p>
          </aside>
        </section>
      </div>
    </main>
  );
}
