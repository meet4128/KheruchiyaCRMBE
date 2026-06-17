const {
  getChecklistPriorityDefaults,
  CHECKLIST_PRIORITY_DUE_OFFSET_MS,
  CHECKLIST_PRIORITY,
} = require('../checklistPriority');

describe('checklistPriority', () => {
  it('exposes due-date defaults for each priority', () => {
    const defaults = getChecklistPriorityDefaults();

    expect(defaults).toEqual([
      {
        value: CHECKLIST_PRIORITY.HIGH,
        dueInMinutes: 15,
        dueInMs: CHECKLIST_PRIORITY_DUE_OFFSET_MS.HIGH,
      },
      {
        value: CHECKLIST_PRIORITY.MEDIUM,
        dueInHours: 8,
        dueInMs: CHECKLIST_PRIORITY_DUE_OFFSET_MS.MEDIUM,
      },
      {
        value: CHECKLIST_PRIORITY.LOW,
        dueInHours: 24,
        dueInMs: CHECKLIST_PRIORITY_DUE_OFFSET_MS.LOW,
      },
    ]);
  });
});
