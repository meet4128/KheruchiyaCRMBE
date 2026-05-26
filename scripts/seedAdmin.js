#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * One-off bootstrap: create (or update) an admin Member who can sign in via
 * POST /api/v1/auth/login with { email, password }.
 *
 * Usage:
 *   node scripts/seedAdmin.js                              # uses defaults
 *   node scripts/seedAdmin.js <email> <password>
 *   node scripts/seedAdmin.js <email> <password> <employeeId>
 *
 * Behaviour:
 *   - If a Member with the given personalEmail already exists, it is UPDATED
 *     (passwordHash rotated, invitationStatus=active, departmentRoles=Admin).
 *     The script never silently leaves a different password in place.
 *   - Reads MONGODB_URI from .env (loaded via dotenv).
 *   - bcrypt cost taken from BCRYPT_ROUNDS in .env (default 12).
 */

require('dotenv').config();

const mongoose = require('mongoose');
const path = require('path');

const Member = require(path.join('..', 'src', 'models', 'Member'));
const passwordService = require(path.join('..', 'src', 'services', 'passwordService'));
const {
  MEMBER_INVITATION_STATUS,
} = require(path.join('..', 'src', 'constants', 'memberInvitationStatus'));

const DEFAULT_EMAIL = 'meet6070@gmail.com';
const DEFAULT_PASSWORD = 'Meet@1234';
const DEFAULT_EMPLOYEE_ID = 'EMP-ADMIN-001';

async function main() {
  const [, , argEmail, argPassword, argEmployeeId] = process.argv;
  const email = (argEmail || DEFAULT_EMAIL).trim().toLowerCase();
  const password = argPassword || DEFAULT_PASSWORD;
  const employeeId = argEmployeeId || DEFAULT_EMPLOYEE_ID;

  if (!process.env.MONGODB_URI) {
    console.error('[seedAdmin] MONGODB_URI is not set in .env. Aborting.');
    process.exit(1);
  }

  try {
    passwordService.assertStrong(password);
  } catch (e) {
    console.error(`[seedAdmin] Password failed strength check: ${e?.errors?.[0]?.message || e.message}`);
    process.exit(1);
  }

  console.log('[seedAdmin] Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`[seedAdmin] Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

  const passwordHash = await passwordService.hashPassword(password);
  const now = new Date();

  const existing = await Member.findOne({ personalEmail: email }).select('+passwordHash');
  if (existing) {
    console.log(`[seedAdmin] Member ${email} exists (id=${existing._id}). Updating to admin + rotating password…`);
    existing.passwordHash = passwordHash;
    existing.invitationStatus = MEMBER_INVITATION_STATUS.ACTIVE;
    existing.employmentStatus = 'active';
    existing.passwordSetAt = now;
    existing.tokenVersion = (existing.tokenVersion || 0) + 1; // invalidate any prior JWTs
    const hasAdminRole = (existing.departmentRoles || []).some(
      (r) => String(r?.department).trim().toLowerCase() === 'admin'
    );
    if (!hasAdminRole) {
      existing.departmentRoles = [
        ...(existing.departmentRoles || []),
        { department: 'Admin', role: 'Admin' },
      ];
    }
    await existing.save();
    console.log('[seedAdmin] Updated existing admin member.');
    console.log(`            id:       ${existing._id}`);
    console.log(`            email:    ${email}`);
    console.log(`            password: ${password}`);
    console.log(`            role:     admin (derived at login)`);
    await mongoose.disconnect();
    return;
  }

  const dupEmployeeId = await Member.findOne({ employeeId });
  const finalEmployeeId = dupEmployeeId ? `${employeeId}-${Date.now()}` : employeeId;
  if (dupEmployeeId) {
    console.warn(
      `[seedAdmin] employeeId ${employeeId} is taken by another member; using ${finalEmployeeId} instead.`
    );
  }

  const adminDoc = {
    fullName: 'Kheruchiya CRM Admin',
    personalEmail: email,
    phoneNumber: { countryCode: '+91', number: '9999999999' },
    homePhoneNumber: { countryCode: '+91', number: '9999999999' },
    officePhoneNumber: { countryCode: '+91', number: '9999999999' },
    addressLine1: 'HQ',
    zipCode: '000000',
    city: 'Ahmedabad',
    firstName: 'Admin',
    lastName: 'User',
    employeeId: finalEmployeeId,
    designation: 'Administrator',
    employmentStatus: 'active',
    dateOfJoining: now,
    departmentRoles: [{ department: 'Admin', role: 'Admin' }],

    passwordHash,
    invitationStatus: MEMBER_INVITATION_STATUS.ACTIVE,
    passwordSetAt: now,
    tokenVersion: 0,
  };

  const created = await Member.create(adminDoc);
  console.log('[seedAdmin] Created new admin member.');
  console.log(`            id:         ${created._id}`);
  console.log(`            email:      ${email}`);
  console.log(`            password:   ${password}`);
  console.log(`            employeeId: ${finalEmployeeId}`);
  console.log(`            role:       admin (derived at login)`);

  await mongoose.disconnect();
}

main()
  .then(() => {
    console.log('[seedAdmin] Done.');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[seedAdmin] Failed:', err?.message || err);
    if (err?.errors) {
      for (const [field, e] of Object.entries(err.errors)) {
        console.error(`  - ${field}: ${e.message}`);
      }
    }
    try {
      await mongoose.disconnect();
    } catch (_e) {
      /* ignore */
    }
    process.exit(1);
  });
