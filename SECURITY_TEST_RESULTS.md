# Security validation — 2026-11-10

- Firebase Firestore emulator 1.22.0, Java 21, SDK 13.2.0.
- **101 security assertions passed** using project demo-lake-painters.
- Jason and Amy role fixtures: allowed priced-job creation and updates.
- Administrator and estimator fixtures: denied priced-job creation and all
  tested pricing/markup/rate/material/equipment overwrite attempts.
- Denied customer reads and writes for unauthenticated, unknown, inactive,
  missing-role, missing-flags and customerAccess=false accounts.
- Denied role escalation, forged identities, stale revisions, malformed/large
  records and cloud deletion. Revocation immediately blocked owner reads/writes.
- App helper tests passed: pricing and nested cost locks, stripping submitted
  costs, safe raster photo sources, editable measurement controls, sign-in gate.
- Existing inline script and Firebase module syntax checks passed.

These are automated emulator and helper tests, not a real browser/two-device
acceptance test or a verification of production membership documents. No live
Firebase settings, roles, records or published estimator were changed.

An application administrator role does not grant Firebase project administration.
Google Cloud IAM and service-account holders can bypass these client rules.
