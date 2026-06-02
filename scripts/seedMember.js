#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Bootstrap a Member who can log in via POST /api/v1/auth/login { email, password }.
 *
 * Usage:
 *   node scripts/seedMember.js <role> [email] [password] [employeeId]
 *
 * Roles: admin | sales | purchase | account
 *
 * Examples:
 *   node scripts/seedMember.js sales katha.raval@gmail.com Katha@1234
 *   node scripts/seedMember.js admin meet6070@gmail.com Meet@1234
 */

require('dotenv').config();

const mongoose = require('mongoose');
const path = require('path');

const Member = require(path.join('..', 'src', 'models', 'Member'));
const passwordService = require(path.join('..', 'src', 'services', 'passwordService'));
const {
  MEMBER_INVITATION_STATUS,
} = require(path.join('..', 'src', 'constants', 'memberInvitationStatus'));
const { AUTH_ROLE, ACCOUNT_DEPARTMENT_ALIASES } = require(path.join('..', 'src', 'constants', 'authRole'));

const ROLE_PROFILES = {
  admin: {
    department: 'Admin',
    roleTitle: 'Admin',
    designation: 'Administrator',
    firstName: 'Admin',
    lastName: 'User',
    fullName: 'CRM Admin',
    defaultEmployeeId: 'EMP-ADMIN-001',
  },
  sales: {
    department: 'Sales',
    roleTitle: 'Associate',
    designation: 'Sales Executive',
    firstName: 'Sales',
    lastName: 'User',
    fullName: 'Sales User',
    defaultEmployeeId: 'EMP-SALES-001',
  },
  purchase: {
    department: 'Purchase',
    roleTitle: 'Executive',
    designation: 'Purchase Executive',
    firstName: 'Purchase',
    lastName: 'User',
    fullName: 'Purchase User',
    defaultEmployeeId: 'EMP-PURCHASE-001',
  },
  account: {
    department: 'Account',
    roleTitle: 'Executive',
    designation: 'Accounts Executive',
    firstName: 'Account',
    lastName: 'User',
    fullName: 'Account User',
    defaultEmployeeId: 'EMP-ACCOUNT-001',
  },
};

function normalizeLoginRole(raw) {
  const r = String(raw || '')
    .trim()
    .toLowerCase();
  if (r === AUTH_ROLE.ADMIN) return AUTH_ROLE.ADMIN;
  if (r === AUTH_ROLE.SALES) return AUTH_ROLE.SALES;
  if (r === AUTH_ROLE.PURCHASE) return AUTH_ROLE.PURCHASE;
  if (r === AUTH_ROLE.ACCOUNT || ACCOUNT_DEPARTMENT_ALIASES.has(r)) return AUTH_ROLE.ACCOUNT;
  return null;
}

function hasDepartmentRole(member, department) {
  const want = String(department).trim().toLowerCase();
  return (member.departmentRoles || []).some(
    (r) => String(r?.department).trim().toLowerCase() === want
  );
}

async function main() {
  const [, , argRole, argEmail, argPassword, argEmployeeId] = process.argv;
  const loginRole = normalizeLoginRole(argRole);
  if (!loginRole) {
    console.error('[seedMember] First argument must be one of: admin, sales, purchase, account');
    process.exit(1);
  }

  const profile = ROLE_PROFILES[loginRole];
  const email = (argEmail || '').trim().toLowerCase();
  const password = argPassword;
  const employeeId = argEmployeeId || profile.defaultEmployeeId;

  if (!email || !password) {
    console.error('[seedMember] Usage: node scripts/seedMember.js <role> <email> <password> [employeeId]');
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error('[seedMember] MONGODB_URI is not set in .env. Aborting.');
    process.exit(1);
  }

  try {
    passwordService.assertStrong(password);
  } catch (e) {
    console.error(
      `[seedMember] Password failed strength check: ${e?.errors?.[0]?.message || e.message}`
    );
    process.exit(1);
  }

  console.log('[seedMember] Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`[seedMember] Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

  const passwordHash = await passwordService.hashPassword(password);
  const now = new Date();
  const deptRole = { department: profile.department, role: profile.roleTitle };

  const existing = await Member.findOne({ personalEmail: email }).select('+passwordHash');
  if (existing) {
    console.log(
      `[seedMember] Member ${email} exists (id=${existing._id}). Updating password + ${loginRole} role…`
    );
    existing.passwordHash = passwordHash;
    existing.invitationStatus = MEMBER_INVITATION_STATUS.ACTIVE;
    existing.employmentStatus = 'active';
    existing.passwordSetAt = now;
    existing.tokenVersion = (existing.tokenVersion || 0) + 1;
    if (!hasDepartmentRole(existing, profile.department)) {
      existing.departmentRoles = [...(existing.departmentRoles || []), deptRole];
    }
    await existing.save();
    console.log('[seedMember] Updated existing member.');
    console.log(`            id:       ${existing._id}`);
    console.log(`            email:    ${email}`);
    console.log(`            password: ${password}`);
    console.log(`            role:     ${loginRole} (derived at login from departmentRoles)`);
    await mongoose.disconnect();
    return;
  }

  const dupEmployeeId = await Member.findOne({ employeeId });
  const finalEmployeeId = dupEmployeeId ? `${employeeId}-${Date.now()}` : employeeId;
  if (dupEmployeeId) {
    console.warn(
      `[seedMember] employeeId ${employeeId} is taken; using ${finalEmployeeId} instead.`
    );
  }

  const localPart = email.split('@')[0] || 'user';
  const nameParts = localPart.replace(/[._-]/g, ' ').split(/\s+/);
  const firstName = nameParts[0]
    ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)
    : profile.firstName;
  const lastName = nameParts[1]
    ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1)
    : profile.lastName;

  const created = await Member.create({
    fullName: `${firstName} ${lastName}`.trim(),
    personalEmail: email,
    phoneNumber: { countryCode: '+91', number: '9876543210' },
    homePhoneNumber: { countryCode: '+91', number: '9123456789' },
    officePhoneNumber: { countryCode: '+91', number: '9988776655' },
    addressLine1: 'Office',
    zipCode: '380001',
    city: 'Ahmedabad',
    firstName,
    lastName,
    employeeId: finalEmployeeId,
    designation: profile.designation,
    employmentStatus: 'active',
    dateOfJoining: now,
    departmentRoles: [deptRole],
    passwordHash,
    invitationStatus: MEMBER_INVITATION_STATUS.ACTIVE,
    passwordSetAt: now,
    tokenVersion: 0,
  });

  console.log('[seedMember] Created new member.');
  console.log(`            id:         ${created._id}`);
  console.log(`            email:      ${email}`);
  console.log(`            password:   ${password}`);
  console.log(`            employeeId: ${finalEmployeeId}`);
  console.log(`            role:       ${loginRole} (derived at login)`);

  await mongoose.disconnect();
}

main()
  .then(() => {
    console.log('[seedMember] Done.');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[seedMember] Failed:', err?.message || err);
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
