// Shared jobs are opt-in. Existing local drafts, saved jobs and pricing stay intact.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import { getFirestore, collection, doc, onSnapshot, runTransaction, serverTimestamp, getDoc, addDoc } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const app = initializeApp({
  apiKey: 'AIzaSyC2uveIo8Vg7JSVVQH9n28vjtxWWKGTYek',
  authDomain: 'lake-painters-field-estimator.firebaseapp.com',
  projectId: 'lake-painters-field-estimator',
  storageBucket: 'lake-painters-field-estimator.firebasestorage.app',
  messagingSenderId: '710911998975',
  appId: '1:710911998975:web:19544571c267e4c7a905ca'
});
const auth = getAuth(app), db = getFirestore(app);
const panel = document.createElement('section');
panel.className = 'card';
panel.style.cssText = 'max-width:710px;margin:14px auto';
panel.innerHTML = `<details><summary>Shared jobs · Firebase</summary>
  <p id="cloud-status" role="status">Sign in to share saved jobs with your team.</p>
  <form id="cloud-login"><label>Email<input name="email" type="email" autocomplete="username" required></label>
  <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
  <button type="submit">Sign in</button></form>
  <div id="cloud-actions" hidden><div class="actions"><button id="cloud-save">Save current job to shared jobs</button>
  <button id="cloud-out" class="secondary">Sign out</button></div>
  <p>Your usual Save Job button still saves on this device. Amy controls shared pricing; other accounts submit inspections for her review.</p>
  <div id="cloud-list"></div></div></details>`;
document.querySelector('header').after(panel);
const el = id => panel.querySelector('#'+id);
const status = text => { el('cloud-status').textContent = text; };
let unsubscribe, unsubscribeSubmissions, generation = 0, busy = false, pricingManager = false;
// All controls that set billing rates, markup, final selling price or production
// assumptions are read-only until the signed-in user's administrator-set role loads.
const pricingKeys = Object.keys(empty()).filter(key => /Rate$|Price$|Cost$|Coverage$/.test(key) || ['pricingMode','markup','deckSpindleMinutes','doorFaceArea','trimReferenceWidth','roofEdgeDifficulty'].includes(key));
function lockPricing() {
  window.lpCanEditPricing = pricingManager;
  document.querySelectorAll('#screen input, #screen select').forEach(input => {
    const handler = (input.getAttribute('oninput') || '') + (input.getAttribute('onchange') || '');
    if (pricingKeys.some(key => handler.includes('d.'+key+'=')) || handler.includes('setAmyMarkup(')) input.disabled = !pricingManager;
  });
}
new MutationObserver(lockPricing).observe(document.querySelector('#screen'), {childList:true, subtree:true});
lockPricing();
const versions = new Map();
function problem(error) {
  if (error.code === 'permission-denied') return 'Access denied. Your Firebase team membership and database rules need to be configured.';
  if (error.code?.startsWith('auth/')) return 'Sign-in failed. Check your email, password and Firebase sign-in settings.';
  return error.message || 'Cloud operation failed. Your local inspection is still available.';
}
el('cloud-login').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget;
  const button = form.querySelector('button'); button.disabled = true;
  try { await signInWithEmailAndPassword(auth, form.elements.email.value.trim(), form.elements.password.value); }
  catch (error) { status(problem(error)); }
  finally { form.elements.password.value = ''; button.disabled = false; }
});
el('cloud-out').onclick = async () => {
  if (busy) return;
  try { await signOut(auth); } catch (error) { status(problem(error)); }
};
el('cloud-save').onclick = async () => {
  if (busy || !auth.currentUser) return;
  if (!hasInspection()) return status('Enter customer details or inspection measurements first.');
  if (!saveJob(true)) return;
  const user = auth.currentUser, token = generation;
  const record = JSON.parse(JSON.stringify(d));
  if (!pricingManager) { for (const key of pricingKeys) delete record[key]; }
  const payload = JSON.stringify(record);
  if (new TextEncoder().encode(payload).length > 900000) return status('This job is too large to share with its photos. Export a JSON backup; the local job is saved.');
  const key = user.uid+':'+record.jobId;
  const expected = versions.get(key) ?? null;
  busy = true; el('cloud-save').disabled = true; el('cloud-out').disabled = true;
  status('Saving shared job…');
  try {
    if (!pricingManager) {
      await addDoc(collection(db, 'inspectionSubmissions'), {payload, submittedBy:user.uid, submittedAt:serverTimestamp()});
      if (generation === token) status('Inspection submitted for Amy to price. Shared pricing was not changed.');
      return;
    }
    const revision = await runTransaction(db, async transaction => {
      const ref = doc(db, 'sharedJobs', record.jobId), existing = await transaction.get(ref);
      if (existing.exists() && existing.data().revision !== expected) throw new Error('A shared copy already exists or someone changed it. Open the latest shared job before saving. Your local changes are saved on this device.');
      const next = (existing.exists() ? existing.data().revision : 0) + 1;
      transaction.set(ref, { payload, revision: next, updatedBy: user.uid, updatedAt: serverTimestamp() });
      return next;
    });
    if (generation === token) { versions.set(key, revision); status('Shared job saved. Your team can now open it.'); }
  } catch (error) { if (generation === token) status(problem(error)); }
  finally { busy = false; el('cloud-save').disabled = false; el('cloud-out').disabled = false; }
};
onAuthStateChanged(auth, async user => {
  generation++; if (unsubscribe) unsubscribe(); if (unsubscribeSubmissions) unsubscribeSubmissions(); versions.clear();
  pricingManager = false; lockPricing();
  panel.querySelectorAll('[data-submissions]').forEach(node => node.remove());
  el('cloud-list').replaceChildren(); el('cloud-login').hidden = !!user;
  el('cloud-actions').hidden = !user;
  if (!user) { status('Signed out. Local inspections remain on this device.'); return; }
  const token = generation;
  el('cloud-save').disabled = true;
  status('Checking account permissions…');
  try {
    const membership = await getDoc(doc(db, 'teamMembers', user.uid));
    if (token !== generation) return;
    if (!membership.exists()) { status('This account has no approved team membership.'); return; }
    pricingManager = membership.data().role === 'pricing';
    lockPricing(); el('cloud-save').disabled = false;
    el('cloud-save').textContent = pricingManager ? 'Save current job to shared jobs' : 'Submit inspection to Amy';
  } catch (error) { if (token === generation) status(problem(error)); return; }
  const submissions = document.createElement('div'); submissions.dataset.submissions = 'true';
  el('cloud-actions').append(submissions);
  if (pricingManager) unsubscribeSubmissions = onSnapshot(collection(db, 'inspectionSubmissions'), snapshot => {
    if (token !== generation) return;
    submissions.replaceChildren();
    for (const item of snapshot.docs) {
      let record; try { record = JSON.parse(item.data().payload); if (!record || !record.jobId) continue; } catch { continue; }
      const button = document.createElement('button');
      button.textContent = 'Review inspection: ' + (record.customer || 'Unnamed customer');
      button.onclick = () => {
        if (token !== generation || !pricingManager || busy) return;
        if (hasInspection() && !saveJob(true)) return;
        // Submissions are untrusted inspection data, never approved pricing.
        const defaults = empty();
        for (const key of pricingKeys) record[key] = defaults[key];
        d = {...defaults, ...JSON.parse(JSON.stringify(record))}; step = 0;
        save(); render(); status('Inspection opened with default pricing. Review and set pricing before sharing.');
      };
      submissions.append(button);
    }
  }, error => { if (token === generation) status(problem(error)); });
  status('Signed in. Loading shared jobs…');
  unsubscribe = onSnapshot(collection(db, 'sharedJobs'), snapshot => {
    if (token !== generation) return;
    const list = el('cloud-list'); list.replaceChildren();
    for (const item of snapshot.docs) {
      const data = item.data(); let record;
      try { record = JSON.parse(data.payload); if (!record || record.jobId !== item.id) continue; } catch { continue; }
      const row = document.createElement('div'); row.className = 'card';
      const title = document.createElement('strong'); title.textContent = record.customer || 'Unnamed customer';
      const address = document.createElement('p'); address.textContent = record.address || 'No address';
      const open = document.createElement('button'); open.textContent = 'Open shared job';
      open.onclick = () => {
        if (token !== generation || busy) return;
        if (hasInspection() && !saveJob(true)) return;
        // Existing draft is archived first, including when opening the same job again.
        d = { ...empty(), ...JSON.parse(JSON.stringify(record)) }; step = 0;
        versions.set(user.uid+':'+item.id, data.revision);
        save(); render(); status('Shared job opened. Use Save current job to shared jobs after editing.');
      };
      row.append(title, address, open); list.append(row);
    }
    status(snapshot.metadata.fromCache ? 'Showing cached shared jobs. Reconnect to confirm updates.' : 'Shared jobs are up to date.');
  }, error => { if (token === generation) status(problem(error)); });
});
