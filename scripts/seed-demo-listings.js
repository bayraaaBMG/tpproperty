#!/usr/bin/env node
/**
 * Seeds the 20 demo listings into Firestore as real `listings/{id}` documents.
 *
 * Runs locally with the Firebase Admin SDK, never from the browser. That's deliberate:
 * firestore.rules only lets a signed-in approved agent create a listing whose ownerId is
 * their own uid and whose status is 'pending', so a browser client physically cannot
 * create an 'active' listing owned by a synthetic 'demo-owner'. Rather than loosening
 * those rules (which would weaken listing-creation security for every user in order to
 * seed sample data once), seeding goes through the Admin SDK, which bypasses rules by
 * design and is only ever run by someone holding a service-account key.
 *
 * Duplicate prevention: document IDs are deterministic ('demo-<original id>'), and by
 * default an existing document is left untouched. Re-running is therefore safe — it can
 * never produce a 21st copy. Note that a demo listing deleted from the admin dashboard
 * WILL be recreated if you run this again; that is what a seed script is for. Nothing
 * runs this automatically, so deleting a demo from the dashboard is permanent as far as
 * the running site is concerned.
 *
 * Usage:
 *   cd scripts && npm install
 *   # service account JSON from Firebase console > Project settings > Service accounts
 *   node seed-demo-listings.js --key ./serviceAccountKey.json
 *   node seed-demo-listings.js --key ./key.json --dry-run   # preview, writes nothing
 *   node seed-demo-listings.js --key ./key.json --force     # overwrite existing docs
 *   node seed-demo-listings.js --key ./key.json --delete    # remove every seeded demo doc
 *
 * GOOGLE_APPLICATION_CREDENTIALS is honoured too, so --key can be omitted if it is set.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valueOf = (f) => { const i = args.indexOf(f); return i > -1 ? args[i + 1] : null; };

const DRY_RUN = has('--dry-run');
const FORCE = has('--force');
const DELETE = has('--delete');
const KEY_PATH = valueOf('--key') || process.env.GOOGLE_APPLICATION_CREDENTIALS;

let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  console.error('firebase-admin is not installed.\n  cd scripts && npm install\n');
  process.exit(1);
}

if (!KEY_PATH) {
  console.error('No service account key. Pass --key ./serviceAccountKey.json or set GOOGLE_APPLICATION_CREDENTIALS.\n');
  process.exit(1);
}
if (!fs.existsSync(KEY_PATH)) {
  console.error(`Service account key not found: ${KEY_PATH}\n`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const seedFile = path.join(__dirname, 'demo-listings.json');
const entries = JSON.parse(fs.readFileSync(seedFile, 'utf8'));

(async () => {
  console.log(`project: ${serviceAccount.project_id}`);
  console.log(`demo listings in seed file: ${entries.length}`);
  console.log(`mode: ${DELETE ? 'DELETE' : FORCE ? 'seed (overwrite existing)' : 'seed (skip existing)'}${DRY_RUN ? ' [dry run]' : ''}\n`);

  let created = 0, skipped = 0, overwritten = 0, removed = 0;

  for (const { _docId, doc } of entries) {
    const ref = db.collection('listings').doc(_docId);
    const snap = await ref.get();

    if (DELETE) {
      if (!snap.exists) { console.log(`  – ${_docId} (not present)`); skipped++; continue; }
      if (!DRY_RUN) await ref.delete();
      console.log(`  ✕ ${_docId} deleted`);
      removed++;
      continue;
    }

    if (snap.exists && !FORCE) {
      console.log(`  – ${_docId} already exists, skipped`);
      skipped++;
      continue;
    }

    const payload = {
      ...doc,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastRefreshedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Preserve the original createdAt when overwriting so the 14-day refresh age and
    // "posted X ago" don't silently reset every time the seed is re-run.
    if (!snap.exists) payload.createdAt = admin.firestore.FieldValue.serverTimestamp();

    if (!DRY_RUN) await ref.set(payload, { merge: false });
    console.log(`  ${snap.exists ? '↻' : '+'} ${_docId}  ${doc.title}`);
    snap.exists ? overwritten++ : created++;
  }

  console.log('\nsummary');
  if (DELETE) console.log(`  deleted: ${removed}   not present: ${skipped}`);
  else console.log(`  created: ${created}   overwritten: ${overwritten}   skipped: ${skipped}`);
  if (DRY_RUN) console.log('  (dry run — nothing was written)');
  process.exit(0);
})().catch((e) => {
  console.error('\nseed failed:', e.message);
  process.exit(1);
});
