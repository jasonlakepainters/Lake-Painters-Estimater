# Firebase shared jobs setup

This adds a collapsible Shared jobs section. All Version 2.7 forms, pricing,
local saves, reports, photos and calculations remain unchanged. Local Save Job
continues to work as before. Sharing uses a separate explicit button.

## Console setup before release

1. Open Firebase project `lake-painters-field-estimator`.
2. Confirm Authentication > Sign-in method > Email/Password is enabled.
   Keep the existing Jason, Amy and Estimator accounts; do not recreate them.
3. Create a Cloud Firestore database in Native/Standard mode if none exists.
   Use production security, never public test-mode rules.
4. Review any existing database rules/data first. If this is a new database,
   publish `firestore.rules` in Firestore > Rules. For an existing database,
   merge these scoped rules without broadening other access.
5. In Authentication > Users copy each approved account's User UID.
6. In Firestore > Data create collection `teamMembers`. Add one document for
   each approved account with document ID exactly equal to that User UID.
   Add a field `name` with the person's display name. Add string field `role`:
   use `pricing` only for Amy, and `estimator` for Jason and Estimator.
   Only Amy can write shared priced jobs. Other accounts submit immutable
   inspection drafts to `inspectionSubmissions` for her review. Do this only for the
   intended three accounts. Client apps cannot create membership documents.
7. Check Authentication > Settings > Authorized domains and add
   `jasonlakepainters.github.io` if needed.

## Verification before merging

- Sign in with an approved account; save a sample shared job.
- Sign in on a second device with another approved account and open that job.
- Check all measurements, photos, pricing options and Amy's controls match.
- Edit and explicitly save to shared jobs, then reopen on the first device.
- Open the same revision in two clients. Save from one; the other's save must
  fail with a conflict message and preserve its local changes.
- Confirm unauthenticated users and accounts without membership cannot read
  or write shared jobs, and clients cannot create membership documents.
- Confirm normal local saves, JSON backup/import and reports still work.

Shared jobs are stored with the full inspection JSON. Jobs exceeding 900 KB
are kept locally and reported as too large to share, including large photos.
Cloud deletion is disabled. Local deletion continues to delete only the local
saved copy. Sign-out leaves local drafts/saved jobs intact, as the app already
does; use trusted devices for customer information.

No production console settings or shared-data permissions were changed while
preparing this branch. End-to-end verification requires console configuration
and the existing account sign-ins. No passwords belong in this repository.

Pricing-role enforcement: estimator submissions never update shared priced jobs.
The client strips pricing settings from submissions and resets them on review.
Firestore refuses sharedJobs writes from any account without the pricing role.
Account roles can only be assigned by the console administrator. Verify both
roles before release, including direct API write attempts by the estimator.
