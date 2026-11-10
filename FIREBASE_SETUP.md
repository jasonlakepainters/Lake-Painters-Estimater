# Secure Firebase sharing setup

Status: draft, not published. The emulator uses only demo-lake-painters; no
production Firebase accounts or records are accessed by automated tests.

## Account permissions

Create teamMembers documents in the Firebase console with document IDs equal
to the exact Authentication User UIDs. Names and emails do not assign roles.

| Account | role (string) | active (boolean) | customerAccess (boolean) |
| --- | --- | --- | --- |
| Jason | pricing | true | true |
| Amy | pricing | true | true |
| Administrator (app account) | administrator | true | true only if approved to see customers |
| Estimator | estimator | true | true only if approved to see customers |

Missing, unknown or inactive roles, or missing/false customerAccess, deny access
to customer jobs and inspection submissions. All approved customer-access team
members can read all shared jobs and submissions. Per-job assignments are not
implemented. Only Jason and Amy should receive pricing. Clients cannot change
membership or roles. Set active=false to revoke cloud access.

The administrator above is an APPLICATION role. Do not give administrator or
estimator staff Google Cloud/Firebase project Owner, Editor, database admin,
service-account credentials, or console permissions to modify rules/data.
Privileged server credentials and project administrators bypass client rules.
Only the owners should administer Firebase membership and deployment.

## What changes

- Jason and Amy can change pricing, markup, production assumptions and material/
  equipment costs and save shared priced jobs.
- Administrator/estimator accounts can inspect, measure and submit drafts.
  They cannot write shared priced jobs, even through direct API requests.
- Cost and production controls are disabled for nonpricing accounts. Submitted
  inspection prices/costs are stripped, including nested item costs and paint
  overrides, and stripped again when owners review them.
- Submissions are untrusted inspection data, not pricing approvals. Review them
  before creating/updating a priced job. Pricing settings reset to defaults on
  review; reopening an existing priced job is required to resolve a revision conflict.
- Invalid photo sources are rejected. Rendering accepts raster data images only.
- Main inspection screens stay hidden until server-verified authorization.
  Local browser storage is retained for existing jobs. Use trusted devices:
  sign-out hides the UI but does not encrypt or erase existing local files/data.
- Existing calculation formulas, measurements, reports and local job storage
  remain. Approval labels now name both owners.

## Before release

1. Confirm Email/Password authentication and the existing account UIDs.
2. In a new Firestore database publish firestore.rules. If existing rules/data
   exist, review them for overlapping permissive matches before merging rules.
3. Provision only the approved accounts above in the Firebase console.
4. Confirm jasonlakepainters.github.io is an authorized Authentication domain.
5. Run automated tests below and actual two-device sign-in/sharing checks.
6. Publish the app only after actual account-role assignments are verified.

## Automated tests

npm install
npx firebase emulators:exec --only firestore --project demo-lake-painters 'node tests/firestore-security.test.mjs'
node tests/app-security.test.cjs

The security suite checks owner access, both restricted roles, anonymous and
unrecognized users, missing flags/roles, revoked users, role escalation,
forged identity, malformed writes, revision conflicts and payload limits.
App checks cover pricing/cost controls, submission cost stripping, photo sources,
editable measurements and the initial sign-in gate.

Cloud deletion is disabled. Jobs larger than 900 KB stay local with an error.
No production rules, account roles or live app have been changed by these tests.
