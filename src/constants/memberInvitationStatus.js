/**
 * Member invitation status — tracks the lifecycle of an admin-created member
 * from invite email → set-password → active account.
 *
 *  pending   — created by admin, password not yet set
 *  active    — member has set their password via the invite/reset link
 *  suspended — admin-disabled; cannot log in even with a valid password
 */
const MEMBER_INVITATION_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
});

const MEMBER_INVITATION_STATUS_VALUES = Object.values(MEMBER_INVITATION_STATUS);

module.exports = {
  MEMBER_INVITATION_STATUS,
  MEMBER_INVITATION_STATUS_VALUES,
};
