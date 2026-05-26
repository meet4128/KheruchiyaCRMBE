/**
 * Purpose of a single-use AuthToken row.
 *
 *  invite — emailed to a new member to let them set their first password (72h TTL)
 *  reset  — emailed to an existing member via Forgot password (1h TTL)
 */
const AUTH_TOKEN_PURPOSE = Object.freeze({
  INVITE: 'invite',
  RESET: 'reset',
});

const AUTH_TOKEN_PURPOSE_VALUES = Object.values(AUTH_TOKEN_PURPOSE);

module.exports = {
  AUTH_TOKEN_PURPOSE,
  AUTH_TOKEN_PURPOSE_VALUES,
};
