const asyncHandler = require('../utils/asyncHandler');
const reminderService = require('../services/reminderService');

const createReminder = asyncHandler(async (req, res) => {
  const { inquiryId, amendmentId } = req.params;
  const userId = req.user?.id;
  const reminder = await reminderService.createReminder(inquiryId, amendmentId, req.body, userId);

  res.status(201).json({
    status: 'success',
    data: { reminder },
  });
});

const getReminder = asyncHandler(async (req, res) => {
  const reminder = await reminderService.getReminder(req.params.id);

  res.status(200).json({
    status: 'success',
    data: { reminder },
  });
});

const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await reminderService.updateReminder(req.params.id, req.body);

  res.status(200).json({
    status: 'success',
    data: { reminder },
  });
});

const updateReminderStatus = asyncHandler(async (req, res) => {
  const reminder = await reminderService.updateReminderStatus(
    req.params.id,
    req.body.status,
    req.body.remindAt
  );

  res.status(200).json({
    status: 'success',
    data: { reminder },
  });
});

const deleteReminder = asyncHandler(async (req, res) => {
  const result = await reminderService.deleteReminder(req.params.id);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const listCalendarEvents = asyncHandler(async (req, res) => {
  const result = await reminderService.listCalendarEvents(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

module.exports = {
  createReminder,
  getReminder,
  updateReminder,
  updateReminderStatus,
  deleteReminder,
  listCalendarEvents,
};
