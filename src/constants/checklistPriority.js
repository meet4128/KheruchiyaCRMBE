/** Checklist priority values — used in model, validation, and due-date defaults */
const CHECKLIST_PRIORITY = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
});

const CHECKLIST_PRIORITY_VALUES = Object.values(CHECKLIST_PRIORITY);

/** Wall-clock offsets from assignment time */
const CHECKLIST_PRIORITY_DUE_OFFSET_MS = Object.freeze({
  [CHECKLIST_PRIORITY.HIGH]: 15 * 60 * 1000,
  [CHECKLIST_PRIORITY.MEDIUM]: 8 * 60 * 60 * 1000,
  [CHECKLIST_PRIORITY.LOW]: 24 * 60 * 60 * 1000,
});

const getChecklistPriorityDefaults = () =>
  CHECKLIST_PRIORITY_VALUES.map((value) => {
    const dueInMs = CHECKLIST_PRIORITY_DUE_OFFSET_MS[value];
    if (value === CHECKLIST_PRIORITY.HIGH) {
      return { value, dueInMinutes: dueInMs / (60 * 1000), dueInMs };
    }
    return { value, dueInHours: dueInMs / (60 * 60 * 1000), dueInMs };
  });

module.exports = {
  CHECKLIST_PRIORITY,
  CHECKLIST_PRIORITY_VALUES,
  CHECKLIST_PRIORITY_DUE_OFFSET_MS,
  getChecklistPriorityDefaults,
};
