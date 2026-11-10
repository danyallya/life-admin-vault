import { describe, expect, it } from 'vitest';
import {
  createDocumentRecord,
  EMPTY_DOCUMENT_DRAFT,
  getExpiryStatus,
  validateDocumentDraft,
  type DocumentDraft,
} from './document-record';

const validDraft: DocumentDraft = {
  title: 'Passport',
  category: 'Identity',
  issuer: 'Public authority',
  issueDate: '2024-03-01',
  expiryDate: '2028-03-01',
  notes: 'Renew in person',
};

describe('document register rules', () => {
  it('requires a name and type and rejects invalid calendar dates', () => {
    expect(validateDocumentDraft(EMPTY_DOCUMENT_DRAFT, '2026-10-27')).toMatchObject({
      title: 'Enter a document name.',
      category: 'Enter a document type.',
    });
    expect(validateDocumentDraft({ ...validDraft, issueDate: '2025-02-29' }, '2026-10-27')).toMatchObject({
      issueDate: 'Enter a valid date.',
    });
  });

  it('rejects future issue dates and expiry before issue date, while accepting equality', () => {
    expect(validateDocumentDraft({ ...validDraft, issueDate: '2026-10-28' }, '2026-10-27')).toMatchObject({
      issueDate: 'Issue date cannot be in the future.',
    });
    expect(validateDocumentDraft({ ...validDraft, expiryDate: '2024-02-29' }, '2026-10-27')).toMatchObject({
      expiryDate: 'Expiry date cannot be before the issue date.',
    });
    expect(validateDocumentDraft({ ...validDraft, expiryDate: validDraft.issueDate }, '2026-10-27')).toEqual({});
  });

  it('classifies expiry boundaries using calendar days', () => {
    expect(getExpiryStatus('', '2026-10-27')).toBe('no-expiry');
    expect(getExpiryStatus('2026-10-26', '2026-10-27')).toBe('expired');
    expect(getExpiryStatus('2026-10-27', '2026-10-27')).toBe('due-today');
    expect(getExpiryStatus('2026-11-26', '2026-10-27')).toBe('due-soon');
    expect(getExpiryStatus('2026-11-27', '2026-10-27')).toBe('upcoming');
  });

  it('trims fields and serializes a local-only record without attachments', () => {
    const record = createDocumentRecord({ ...validDraft, title: ' Passport ', notes: ' Renew soon ' }, 'doc-1', 1234);
    expect(JSON.parse(JSON.stringify(record))).toEqual({
      id: 'doc-1',
      title: 'Passport',
      category: 'Identity',
      issuer: 'Public authority',
      issueDate: '2024-03-01',
      expiryDate: '2028-03-01',
      notes: 'Renew soon',
      createdAt: 1234,
      updatedAt: 1234,
      syncState: 'local-only',
    });
    expect(Object.keys(record)).not.toContain('file');
  });
});
