# scripts

Local maintenance scripts. **Not part of the deployed site** — tpproperty is a static site
with no build step, and nothing in here runs in the browser or on Vercel.

## seed-demo-listings.js

Seeds the 20 demo/sample listings into Firestore as real `listings/{id}` documents, so they
behave exactly like user-submitted listings: they appear on the public Listings page, and in
**Удирдлага → Зарууд** where an admin or owner can view and permanently delete them.

### Why it runs locally instead of from the admin dashboard

`firestore.rules` only lets a signed-in approved agent create a listing whose `ownerId` is
their own uid and whose `status` is `'pending'`. A browser client therefore *cannot* create
an `active` listing owned by a synthetic `demo-owner` — by design. Loosening that rule to
allow it would weaken listing-creation security for every user just to place sample data
once, so seeding instead goes through the Firebase Admin SDK, which bypasses rules and only
runs for whoever holds a service-account key.

### Usage

```bash
cd scripts
npm install

# Service account key: Firebase console → Project settings → Service accounts →
# "Generate new private key". Never commit it (scripts/.gitignore already blocks *key*.json).
node seed-demo-listings.js --key ./serviceAccountKey.json

node seed-demo-listings.js --key ./key.json --dry-run   # preview, writes nothing
node seed-demo-listings.js --key ./key.json --force     # overwrite existing demo docs
node seed-demo-listings.js --key ./key.json --delete    # remove every seeded demo doc
```

`GOOGLE_APPLICATION_CREDENTIALS` is honoured too, in which case `--key` can be omitted.

### Duplicate prevention

Document IDs are deterministic (`demo-2`, `demo-4`, … matching the original listing ids),
and an existing document is skipped unless `--force` is passed. Re-running can never create
a 21st copy. Nothing triggers this script automatically, so a demo listing deleted from the
admin dashboard stays deleted — it only comes back if someone deliberately re-runs the seed.

### Data

`demo-listings.json` holds the 20 listings, recovered from git commit `e8ea6dd` (the last
commit before the hardcoded demo array was removed from `js/data.js`) and converted to the
same document shape `js/my-listings.js` writes. Each document carries `isDemo: true`, which
is what drives the `DEMO` badge in the admin table, the "Жишээ зар" badge on public cards,
and the guard that stops anyone starting a chat with a demo seller that doesn't exist.
