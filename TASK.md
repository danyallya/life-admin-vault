# Active task

**ID:** VAULT-001  
**Title:** Add a document register with expiry reminder and clear deletion.

## Context

The technical shell exists; the product workflow does not. Build the first safe, end-to-end domain slice for Life Admin Vault.

## Acceptance criteria

- Type the records domain record, validation rules and lifecycle.
- Add a create/review flow that works without a server round-trip.
- Persist a draft with Dexie and show saved, unsaved and sync state truthfully.
- Test valid/invalid input, date/order boundaries and serialization.
- Document retention, deletion and limitations of the offline slice.
- Respect this guardrail: Store metadata before files; encryption and device recovery must be designed before real documents are accepted.

## Status

Completed on 2026-10-27 in `product/day-001-vault-001-document-register`. The local register, Dexie draft persistence, expiry status and deletion flow are implemented. `npm run verify` passes. Manual screen-reader and offline browser acceptance remain for VAULT-007/VAULT-008.

**Next:** VAULT-002 — Validate records and add empty/error/deletion states. The current slice includes baseline validation and clear deletion; this next task covers the broader state and recovery behavior.
