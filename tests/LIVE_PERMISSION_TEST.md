# Live permission test before release

Run tests/live-permissions.html on a trusted computer. Download the raw HTML
file and open it in Chrome or Safari. The page imports Google's Firebase SDK
from gstatic.com and connects only to lake-painters-field-estimator. If the
browser blocks local modules, serve this test folder from localhost rather
than weakening browser security. Do not paste account passwords into chat.

1. Click Start anonymous checks. Both attempts must be denied.
2. Sign in with Jason's existing Firebase email/password. Check three passes.
3. Sign in with Amy's existing, different account. Check three passes.
4. Sign in with Estimator's existing account. Check four passes.
5. Require COMPLETE — 12 live checks passed. Download the results.
6. In Firebase > Firestore > Data, remove only the exact test paths shown in
   the report. Normally two sharedJobs documents and one inspectionSubmissions
   document are created. A failure can leave other listed test documents.
   Never delete the whole collection or any real record.

The checker uses unique permission-test-UUID document names and synthetic
customer data. It never queries a customer collection, touches existing job
records, modifies team membership, or changes rules. Each login uses a separate
phase with memory-only Firebase authentication and is signed out afterward.
Passwords are cleared and are not included in downloaded results. It verifies
account roles/flags from the server, requires three different UIDs and stops
on unexpected results. It does not publish the estimator.

Checks: anonymous reads/writes blocked; both owners create/read/update dummy
priced jobs; estimator reads authorized dummy data and submits an inspection,
but cannot create a priced job or overwrite owner pricing/costs/production.

This is a targeted live acceptance check, supplementing the 101 emulator
security assertions. It does not replace the browser/two-device estimator
workflow test. The deployed Firebase rules and actual account configuration
are not verified until a person completes this page with real credentials.

Harness verification against the emulator:
  npx firebase emulators:exec --only firestore --project demo-lake-painters 'node tests/live-harness.test.mjs'
