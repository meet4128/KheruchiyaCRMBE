#!/usr/bin/env node
/**
 * One-off migration: convert `checklist[].user` from a plain string to the
 * Member-snapshot object shape.
 *
 * Old shape:  user: "agent-1"            (string, or "" default)
 * New shape:  user: {
 *               _id, fullName, firstName, lastName, employeeId
 *             }
 *
 * For every inquiry that still has a string `user` on any checklist item, this
 * script resolves the old string against the members collection (by _id,
 * employeeId, or fullName). When a member is found the full snapshot is written;
 * otherwise the raw string is preserved in `fullName` as a best-effort fallback.
 * Empty-string users are unset (the field is optional).
 *
 * Usage:
 *   node scripts/migrateChecklistUserToObject.js            # apply changes
 *   node scripts/migrateChecklistUserToObject.js --dry-run  # report only
 *
 * Behaviour:
 *   - Reads MONGODB_URI from .env (loaded via dotenv).
 *   - Operates on the raw collections to bypass Mongoose casting.
 *   - Idempotent: items whose `user` is already an object are skipped, so the
 *     script is safe to re-run.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const path = require('path');

const Inquiry = require(path.join('..', 'src', 'models', 'Inquiry'));
const Member = require(path.join('..', 'src', 'models', 'Member'));

const DRY_RUN = process.argv.includes('--dry-run');

/** Builds the object snapshot for a single legacy string `user` value. */
async function resolveUserObject(rawValue, memberCollection) {
  const value = String(rawValue).trim();

  // Empty legacy value → treat as "no user assigned" (field is optional).
  if (!value) {
    return undefined;
  }

  // Try to match an existing member by _id, employeeId, or fullName.
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

  // No member matched — keep the raw string as the display name.
  return {
    _id: '',
    fullName: value,
    firstName: '',
    lastName: '',
    employeeId: '',
  };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('[migrateChecklistUser] MONGODB_URI is not set in .env. Aborting.');
    process.exit(1);
  }

  console.log(`[migrateChecklistUser] Connecting to MongoDB… (dryRun=${DRY_RUN})`);
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(
    `[migrateChecklistUser] Connected to ${mongoose.connection.host}/${mongoose.connection.name}`
  );

  const inquiries = Inquiry.collection;
  const members = Member.collection;

  // Only inquiries that still carry a string-typed checklist user.
  const cursor = inquiries.find({ 'checklist.user': { $type: 'string' } });

  let scanned = 0;
  let updated = 0;
  let itemsConverted = 0;

  for await (const inquiry of cursor) {
    scanned += 1;
    let changed = false;

    const newChecklist = [];
    for (const item of inquiry.checklist || []) {
      if (typeof item.user === 'string') {
        const userObj = await resolveUserObject(item.user, members);
        itemsConverted += 1;
        changed = true;
        const nextItem = { ...item };
        if (userObj === undefined) {
          delete nextItem.user;
        } else {
          nextItem.user = userObj;
        }
        newChecklist.push(nextItem);
      } else {
        newChecklist.push(item);
      }
    }

    if (!changed) {
      continue;
    }

    updated += 1;
    if (DRY_RUN) {
      console.log(`[migrateChecklistUser] [dry-run] would update inquiry ${inquiry._id}`);
      continue;
    }

    await inquiries.updateOne(
      { _id: inquiry._id },
      { $set: { checklist: newChecklist } }
    );
  }

  console.log(
    `[migrateChecklistUser] Scanned ${scanned} inquiries, ${updated} updated, ` +
      `${itemsConverted} checklist items converted${DRY_RUN ? ' (dry-run, no writes)' : ''}.`
  );

  await mongoose.disconnect();
}

main()
  .then(() => {
    console.log('[migrateChecklistUser] Done.');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[migrateChecklistUser] Failed:', err?.message || err);
    try {
      await mongoose.disconnect();
    } catch (_e) {
      /* ignore */
    }
    process.exit(1);
  });
