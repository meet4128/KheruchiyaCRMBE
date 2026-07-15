const mongoose = require('mongoose');
const { RRule } = require('rrule');
const Reminder = require('../models/Reminder');
const Amendment = require('../models/Amendment');
const Member = require('../models/Member');
const Inquiry = require('../models/Inquiry');
const AppError = require('../utils/AppError');
const { messages } = require('../locales');

/** Fields exposed for the assignee/in-loop member population */
const MEMBER_FIELDS = 'fullName firstName lastName personalEmail';

const assertValidObjectId = (id, message) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(message || messages.errors.invalidIdOrFormat, 400);
  }
};

/** Verifies every referenced member id exists; throws 422 otherwise. */
const assertMembersExist = async (ids = []) => {
  const unique = [...new Set(ids.map(String))];
  if (unique.length === 0) return;
  const count = await Member.countDocuments({ _id: { $in: unique } });
  if (count !== unique.length) {
    throw new AppError(messages.validation.reminder.memberNotFound, 422);
  }
};

/** Loads a reminder by id with agent/in-loop members populated. */
const loadReminder = async (id) => {
  assertValidObjectId(id, messages.errors.reminderNotFound);
  const reminder = await Reminder.findById(id)
    .populate('agent', MEMBER_FIELDS)
    .populate('inLoopUsers', MEMBER_FIELDS)
    .lean();
  if (!reminder) {
    throw new AppError(messages.errors.reminderNotFound, 404);
  }
  return reminder;
};

/**
 * Creates a follow-up reminder for a finalized amendment.
 *
 * @param {string} inquiryId
 * @param {string} amendmentId - Amendment business id (e.g. TAIR12345)
 * @param {Object} payload - Validated body
 * @param {string} userId
 */
const createReminder = async (inquiryId, amendmentId, payload, userId) => {
  assertValidObjectId(inquiryId, messages.errors.inquiryNotFound);

  const inquiry = await Inquiry.findById(inquiryId).select('_id').lean();
  if (!inquiry) {
    throw new AppError(messages.errors.inquiryNotFound, 404);
  }

  const amendment = await Amendment.findOne({ inquiryId, amendmentId }).select('_id').lean();
  if (!amendment) {
    throw new AppError(messages.errors.amendmentNotFound, 404);
  }

  await assertMembersExist([payload.agent, ...(payload.inLoopUsers || [])]);

  const created = await Reminder.create({
    inquiryId,
    amendmentId,
    sessionId: payload.sessionId,
    note: payload.note || '',
    remindAt: payload.remindAt,
    recurrenceRule: payload.recurrenceRule || '',
    agent: payload.agent,
    inLoopUsers: payload.inLoopUsers || [],
    priority: payload.priority,
    createdBy: userId,
  });

  return loadReminder(created._id);
};

const getReminder = async (id) => loadReminder(id);

const updateReminder = async (id, payload) => {
  assertValidObjectId(id, messages.errors.reminderNotFound);

  if (payload.agent || payload.inLoopUsers) {
    const ids = [];
    if (payload.agent) ids.push(payload.agent);
    if (payload.inLoopUsers) ids.push(...payload.inLoopUsers);
    await assertMembersExist(ids);
  }

  const updated = await Reminder.findByIdAndUpdate(
    id,
    { $set: payload },
    {
      new: true,
      runValidators: true,
    }
  );
  if (!updated) {
    throw new AppError(messages.errors.reminderNotFound, 404);
  }

  return loadReminder(updated._id);
};

const updateReminderStatus = async (id, status, remindAt) => {
  assertValidObjectId(id, messages.errors.reminderNotFound);

  const update = { status };
  // A status change may optionally carry a new reminder time (reschedule)
  if (remindAt) {
    update.remindAt = remindAt;
  }

  const updated = await Reminder.findByIdAndUpdate(
    id,
    { $set: update },
    {
      new: true,
      runValidators: true,
    }
  );
  if (!updated) {
    throw new AppError(messages.errors.reminderNotFound, 404);
  }

  return loadReminder(updated._id);
};

const deleteReminder = async (id) => {
  assertValidObjectId(id, messages.errors.reminderNotFound);
  const deleted = await Reminder.findByIdAndDelete(id).lean();
  if (!deleted) {
    throw new AppError(messages.errors.reminderNotFound, 404);
  }
  return { id: String(deleted._id) };
};

/**
 * Expands a reminder into calendar events within [from, to].
 * Non-recurring → at most one event; recurring → one per RRULE occurrence in range.
 */
const expandReminder = (reminder, from, to) => {
  const base = { ...reminder, reminderId: String(reminder._id) };

  if (!reminder.recurrenceRule) {
    // Single occurrence (query already scoped it into range)
    return [{ ...base, occurrenceAt: reminder.remindAt }];
  }

  const rule = new RRule({
    ...RRule.parseString(String(reminder.recurrenceRule).replace(/^RRULE:/i, '')),
    dtstart: new Date(reminder.remindAt),
  });

  // inclusive on both ends
  return rule.between(from, to, true).map((occurrenceAt) => ({ ...base, occurrenceAt }));
};

/**
 * Lists calendar events (expanded reminder occurrences) in a date range.
 *
 * @param {Object} params - Validated query: { from, to, agent?, status? }
 * @returns {Promise<{ items: any[], from: Date, to: Date, totalItems: number }>}
 */
const listCalendarEvents = async ({ from, to, agent, status } = {}) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const baseFilter = {};
  if (agent) baseFilter.agent = agent;
  if (status) baseFilter.status = status;

  // A recurring reminder can start before `from` yet still occur in range, so we
  // only bound its start by `to`; non-recurring ones must fall inside the window.
  const filter = {
    ...baseFilter,
    $or: [
      { recurrenceRule: { $in: [null, ''] }, remindAt: { $gte: fromDate, $lte: toDate } },
      { recurrenceRule: { $nin: [null, ''] }, remindAt: { $lte: toDate } },
    ],
  };

  const reminders = await Reminder.find(filter)
    .populate('agent', MEMBER_FIELDS)
    .populate('inLoopUsers', MEMBER_FIELDS)
    .lean();

  const items = reminders
    .flatMap((r) => expandReminder(r, fromDate, toDate))
    .sort((a, b) => new Date(a.occurrenceAt) - new Date(b.occurrenceAt));

  return {
    items,
    from: fromDate,
    to: toDate,
    totalItems: items.length,
  };
};

module.exports = {
  createReminder,
  getReminder,
  updateReminder,
  updateReminderStatus,
  deleteReminder,
  listCalendarEvents,
};
