const { CHECKLIST_PRIORITY_DUE_OFFSET_MS } = require('../constants/checklistPriority');

const computeDueDateFromPriority = (priority, fromDate = new Date()) => {
  const offsetMs = CHECKLIST_PRIORITY_DUE_OFFSET_MS[priority];
  if (!offsetMs) {
    return undefined;
  }
  return new Date(fromDate.getTime() + offsetMs);
};

/** Sets dueDate from priority when dueDate is omitted; keeps explicit dueDate unchanged. */
const applyChecklistDueDates = (checklist, fromDate = new Date()) => {
  if (!Array.isArray(checklist) || checklist.length === 0) {
    return checklist;
  }

  return checklist.map((item) => {
    if (item.dueDate != null && item.dueDate !== '') {
      return item;
    }

    const dueDate = computeDueDateFromPriority(item.priority, fromDate);
    if (!dueDate) {
      return item;
    }

    return { ...item, dueDate };
  });
};

module.exports = { computeDueDateFromPriority, applyChecklistDueDates };
