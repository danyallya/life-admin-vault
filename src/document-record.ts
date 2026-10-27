export type DocumentDraft = {
  title: string;
  category: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  notes: string;
};

export type DocumentRecord = DocumentDraft & {
  id: string;
  createdAt: number;
  updatedAt: number;
  syncState: 'local-only';
};

export const EMPTY_DOCUMENT_DRAFT: DocumentDraft = {
  title: '',
  category: '',
  issuer: '',
  issueDate: '',
  expiryDate: '',
  notes: '',
};

export type DocumentDraftErrors = Partial<Record<keyof DocumentDraft, string>>;

function dateValue(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? timestamp
    : null;
}

export function validateDocumentDraft(draft: DocumentDraft, today = new Date().toISOString().slice(0, 10)): DocumentDraftErrors {
  const errors: DocumentDraftErrors = {};
  const title = draft.title.trim();
  const category = draft.category.trim();
  if (!title) errors.title = 'Enter a document name.';
  else if (title.length > 120) errors.title = 'Use 120 characters or fewer.';
  if (!category) errors.category = 'Enter a document type.';
  else if (category.length > 80) errors.category = 'Use 80 characters or fewer.';
  if (draft.issuer.trim().length > 120) errors.issuer = 'Use 120 characters or fewer.';
  if (draft.notes.trim().length > 500) errors.notes = 'Use 500 characters or fewer.';

  const issueTimestamp = draft.issueDate ? dateValue(draft.issueDate) : null;
  const expiryTimestamp = draft.expiryDate ? dateValue(draft.expiryDate) : null;
  if (draft.issueDate && issueTimestamp === null) errors.issueDate = 'Enter a valid date.';
  else if (issueTimestamp !== null && dateValue(today) !== null && issueTimestamp > dateValue(today)!) {
    errors.issueDate = 'Issue date cannot be in the future.';
  }
  if (draft.expiryDate && expiryTimestamp === null) errors.expiryDate = 'Enter a valid date.';
  else if (issueTimestamp !== null && expiryTimestamp !== null && expiryTimestamp < issueTimestamp) {
    errors.expiryDate = 'Expiry date cannot be before the issue date.';
  }
  return errors;
}

export function createDocumentRecord(
  draft: DocumentDraft,
  id: string,
  now: number,
): DocumentRecord {
  return {
    id,
    title: draft.title.trim(),
    category: draft.category.trim(),
    issuer: draft.issuer.trim(),
    issueDate: draft.issueDate,
    expiryDate: draft.expiryDate,
    notes: draft.notes.trim(),
    createdAt: now,
    updatedAt: now,
    syncState: 'local-only',
  };
}

export type ExpiryStatus = 'no-expiry' | 'expired' | 'due-today' | 'due-soon' | 'upcoming';

export function getExpiryStatus(expiryDate: string, today = new Date().toISOString().slice(0, 10)): ExpiryStatus {
  if (!expiryDate) return 'no-expiry';
  const expiry = dateValue(expiryDate);
  const current = dateValue(today);
  if (expiry === null || current === null) return 'no-expiry';
  const days = Math.round((expiry - current) / 86_400_000);
  if (days < 0) return 'expired';
  if (days === 0) return 'due-today';
  if (days <= 30) return 'due-soon';
  return 'upcoming';
}

export function localDateISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
