# Security and data policy

- Collect the minimum data; treat user content as private by default.
- No authentication, authorization, encryption-at-rest or production backup policy exists yet. Do not enter real sensitive data.
- Keep secrets in untracked .env; never expose DB/provider keys to browsers.
- Never cache APIs, authenticated pages or personal records in the service worker.
- Define export, deletion, retention, access logs and incident response before launch.
- Domain guardrail: Store metadata before files; encryption and device recovery must be designed before real documents are accepted.
- Review threat model, roles and offline-device recovery before launch.

## Local document-register retention

The first register slice stores metadata only in browser IndexedDB. It does not accept or cache files, and it does not encrypt records at the application layer. Entries stay in this browser until a user deletes a record or clears the site's browser data; clearing browser data or losing the device can permanently remove them. There is no backup, recovery, cross-device sync or automatic expiry notification. Do not use real sensitive records until encryption, access controls and device recovery have been designed and reviewed.
