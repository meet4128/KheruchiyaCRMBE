#!/usr/bin/env node
/**
 * One-off migration: convert `checklist[].user` from a single object (or a
 * legacy string) into an ARRAY of Member-snapshot objects.
 *
 * Shapes handled:
 *   "agent-1"          (legacy string)  → [ { _id, fullName, ... } ]
 *   { _id, fullName }  (single object)  → [ { _id, fullName } ]
 *   [ { ... } ]        (already array)  → left unchanged (skipped)
 *   ""                 (empty string)   → [] (no user assigned)
 *
 * A legacy string is resolved against the members collection (by _id,
 * employeeId, or fullName); when no member matches, the raw string is preserved
 * in `fullName` as a best-effort fallback.
 *
 * Usage:
 *   node scripts/migrateChecklistUserToArray.js            # apply changes
 *   node scripts/migrateChecklistUserToArray.js --dry-run  # report only
 *
 * Behaviour:
 *   - Reads MONGODB_URI from .env (loaded via dotenv).
 *   - Operates on the raw collections to bypass Mongoose casting.
 *   - Idempotent: items whose `user` is already an array are skipped, so the
 *     script is safe to re-run.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const path = require('path');

const Inquiry = require(path.join('..', 'src', 'models', 'Inquiry'));
const Member = require(path.join('..', 'src', 'models', 'Member'));

const DRY_RUN = process.argv.includes('--dry-run');

/** Resolves a legacy string `user` value to a single snapshot object. */
async function resolveUserObject(rawValue, memberCollection) {
  const value = String(rawValue).trim();
  if (!value) {
    return undefined;
  }

  const or = [{ employeeId: value }, { fullName: value }];
  if (mongoose.Types.ObjectId.isValid(value)) {
    or.push({ _id: new mongoose.Types.ObjectId(value) });
  }

  const member = await memberCollection.findOne(
    { $or: or },
    { projection: { fullName: 1, firstName: 1, lastName: 1, employeeId: 1 } }
  );

  if (member) {
    return {
      _id: String(member._id),
      fullName: member.fullName || '',
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      employeeId: member.employeeId || '',
    };
  }

  return { _id: '', fullName: value, firstName: '', lastName: '', employeeId: '' };
}

/**
 * Normalizes a checklist item's `user` field to an array.
 * Returns { changed, value } — value is the array to store, or undefined to
 * signal the item is already in the target shape (no write needed).
 */
async function normalizeUser(user, memberCollection) {
  // Already an array → nothing to do.
  if (Array.isArray(user)) {
    return { changed: false };
  }

  // Legacy string → resolve to a single object, wrapped in an array.
  if (typeof user === 'string') {
    const obj = await resolveUserObject(user, memberCollection);
    return { changed: true, value: obj ? [obj] : [] };
  }

  // Single object → wrap in an array.
  if (user && typeof user === 'object') {
    return { changed: true, value: [user] };
  }

  // null / undefined → empty array.
  return { changed: true, value: [] };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('[migrateChecklistUserArray] MONGODB_URI is not set in .env. Aborting.');
    process.exit(1);
  }

  console.log(`[migrateChecklistUserArray] Connecting to MongoDB… (dryRun=${DRY_RUN})`);
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(
    `[migrateChecklistUserArray] Connected to ${mongoose.connection.host}/${mongoose.connection.name}`
  );

  const inquiries = Inquiry.collection;
  const members = Member.collection;

  // Any inquiry with at least one checklist item whose `user` is NOT an array.
  const cursor = inquiries.find({
    checklist: { $elemMatch: { user: { $exists: true, $not: { $type: 'array' } } } },
  });

  let scanned = 0;
  let updated = 0;
  let itemsConverted = 0;

  for await (const inquiry of cursor) {
    scanned += 1;
    let changed = false;

    const newChecklist = [];
    for (const item of inquiry.checklist || []) {
      const result = await normalizeUser(item.user, members);
      if (result.changed) {
        itemsConverted += 1;
        changed = true;
        newChecklist.push({ ...item, user: result.value });
      } else {
        newChecklist.push(item);
      }
    }

    if (!changed) {
      continue;
    }

    updated += 1;
    if (DRY_RUN) {
      console.log(`[migrateChecklistUserArray] [dry-run] would update inquiry ${inquiry._id}`);
      continue;
    }

    await inquiries.updateOne({ _id: inquiry._id }, { $set: { checklist: newChecklist } });
  }

  console.log(
    `[migrateChecklistUserArray] Scanned ${scanned} inquiries, ${updated} updated, ` +
      `${itemsConverted} checklist items converted${DRY_RUN ? ' (dry-run, no writes)' : ''}.`
  );

  await mongoose.disconnect();
}

main()
  .then(() => {
    console.log('[migrateChecklistUserArray] Done.');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[migrateChecklistUserArray] Failed:', err?.message || err);
    try {
      await mongoose.disconnect();
    } catch (_e) {
      /* ignore */
    }
    process.exit(1);
  });
