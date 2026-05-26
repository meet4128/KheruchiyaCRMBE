/**
 * Canonical JWT roles. Derived from the member's `departmentRoles[]` at login time
 * (see authController.deriveRoleFromMember) and enforced by requireRoles middleware.
 *
 * Mapping (case-insensitive on member.departmentRoles[].department):
 *   Admin                          → 'admin'
 *   Sales                          → 'sales'
 *   Purchase                       → 'purchase'
 *   Account / Accounts / Accounting → 'account'
 *   (anything else, or no role)    → 'user'
 */
const AUTH_ROLE = Object.freeze({
  ADMIN: 'admin',
  SALES: 'sales',
  PURCHASE: 'purchase',
  ACCOUNT: 'account',
  USER: 'user',
});

const AUTH_ROLE_VALUES = Object.values(AUTH_ROLE);

/**
 * Lowercased department strings that map to the `account` role. Kept as a Set
 * so future variants (e.g. 'finance') can be added in one place.
 */
const ACCOUNT_DEPARTMENT_ALIASES = new Set(['account', 'accounts', 'accounting']);

module.exports = {
  AUTH_ROLE,
  AUTH_ROLE_VALUES,
  ACCOUNT_DEPARTMENT_ALIASES,
};
