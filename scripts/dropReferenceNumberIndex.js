#!/usr/bin/env node
/**
 * One-off migration: drop the stale UNIQUE index on the inquiries collection
 * that enforced reference-number uniqueness.
 *
 * Reference number (and phone number) are no longer unique — the same client
 * may raise multiple inquiries across hotel and air ticket bookings. Removing
 * `unique: true` from the Mongoose schema does NOT drop an index already built
 * in the database, so this script drops it explicitly. A fresh non-unique index
 * is rebuilt automatically by Mongoose on next app start (autoIndex).
 *
 * Usage:
 *   node scripts/dropReferenceNumberIndex.js
 *
 * Behaviour:
 *   - Reads MONGODB_URI from .env (loaded via dotenv).
 *   - Idempotent: if the unique index is already gone, it reports and exits 0.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const path = require('path');

const Inquiry = require(path.join('..', 'src', 'models', 'Inquiry'));

// Field spec of the compound reference-number index.
const INDEX_KEY = { 'referenceNumber.countryCode': 1, 'referenceNumber.number': 1 };

const sameKey = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('[dropReferenceNumberIndex] MONGODB_URI is not set in .env. Aborting.');
    process.exit(1);
  }

  console.log('[dropReferenceNumberIndex] Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(
    `[dropReferenceNumberIndex] Connected to ${mongoose.connection.host}/${mongoose.connection.name}`
  );

  const collection = Inquiry.collection;
  const indexes = await collection.indexes();

  // Find the reference-number index only if it is currently unique.
  const staleUnique = indexes.find((idx) => sameKey(idx.key, INDEX_KEY) && idx.unique);

  if (!staleUnique) {
    console.log(
      '[dropReferenceNumberIndex] No unique reference-number index found — nothing to drop.'
    );
    await mongoose.disconnect();
    return;
  }

  console.log(`[dropReferenceNumberIndex] Dropping unique index "${staleUnique.name}"…`);
  await collection.dropIndex(staleUnique.name);
  console.log('[dropReferenceNumberIndex] Dropped. A non-unique index will be rebuilt on app start.');

  await mongoose.disconnect();
}

main()
  .then(() => {
    console.log('[dropReferenceNumberIndex] Done.');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[dropReferenceNumberIndex] Failed:', err?.message || err);
    try {
      await mongoose.disconnect();
    } catch (_e) {
      /* ignore */
    }
    process.exit(1);
  });
