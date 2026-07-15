#!/usr/bin/env node
/**
 * One-off migration: convert reminder `status` from the old lowercase
 * calendar-lifecycle values to the new UPPER_SNAKE follow-up values
 * (aligned with INQUIRY_STATUS).
 *
 * Mapping:
 *   pending    → PENDING
 *   snoozed    → PENDING      (still an open follow-up, just rescheduled)
 *   completed  → COMPLETED
 *   dismissed  → CANCELLED
 *
 * Usage:
 *   node scripts/migrateReminderStatus.js            # apply changes
 *   node scripts/migrateReminderStatus.js --dry-run  # report only
 *
 * Behaviour:
 *   - Reads MONGODB_URI from .env (loaded via dotenv).
 *   - Operates on the raw collection to bypass Mongoose casting.
 *   - Idempotent: docs already holding a new UPPER_SNAKE value are skipped,
 *     so the script is safe to re-run.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const path = require('path');

const Reminder = require(path.join('..', 'src', 'models', 'Reminder'));

const DRY_RUN = process.argv.includes('--dry-run');

/** Old lowercase value → new UPPER_SNAKE value. */
const STATUS_MAP = {
  pending: 'PENDING',
  snoozed: 'PENDING',
  completed: 'COMPLETED',
  dismissed: 'CANCELLED',
};

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('[migrateReminderStatus] MONGODB_URI is not set in .env. Aborting.');
    process.exit(1);
  }

  console.log(`[migrateReminderStatus] Connecting to MongoDB… (dryRun=${DRY_RUN})`);
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(
    `[migrateReminderStatus] Connected to ${mongoose.connection.host}/${mongoose.connection.name}`
  );

  const reminders = Reminder.collection;

  // Only reminders still holding a legacy lowercase status.
  const cursor = reminders.find({ status: { $in: Object.keys(STATUS_MAP) } });

  let scanned = 0;
  let updated = 0;

  for await (const reminder of cursor) {
    scanned += 1;
    const next = STATUS_MAP[reminder.status];
    if (!next || next === reminder.status) {
      continue;
    }

    updated += 1;
    if (DRY_RUN) {
      console.log(
        `[migrateReminderStatus] [dry-run] would update reminder ${reminder._id}: ` +
          `${reminder.status} → ${next}`
      );
      continue;
    }

    await reminders.updateOne({ _id: reminder._id }, { $set: { status: next } });
  }

  console.log(
    `[migrateReminderStatus] Scanned ${scanned} reminders, ${updated} updated` +
      `${DRY_RUN ? ' (dry-run, no writes)' : ''}.`
  );

  await mongoose.disconnect();
}

main()
  .then(() => {
    console.log('[migrateReminderStatus] Done.');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[migrateReminderStatus] Failed:', err?.message || err);
    try {
      await mongoose.disconnect();
    } catch (_e) {
      /* ignore */
    }
    process.exit(1);
  });
