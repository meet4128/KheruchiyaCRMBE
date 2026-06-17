const { computeDueDateFromPriority, applyChecklistDueDates } = require('../checklistDueDate');
const { CHECKLIST_PRIORITY } = require('../../constants/checklistPriority');

describe('checklistDueDate', () => {
  const baseTime = new Date('2026-06-12T10:00:00.000Z');

  describe('computeDueDateFromPriority', () => {
    it('adds 15 minutes for HIGH', () => {
      const dueDate = computeDueDateFromPriority(CHECKLIST_PRIORITY.HIGH, baseTime);
      expect(dueDate.toISOString()).toBe('2026-06-12T10:15:00.000Z');
    });

    it('adds 8 hours for MEDIUM', () => {
      const dueDate = computeDueDateFromPriority(CHECKLIST_PRIORITY.MEDIUM, baseTime);
      expect(dueDate.toISOString()).toBe('2026-06-12T18:00:00.000Z');
    });

    it('adds 24 hours for LOW', () => {
      const dueDate = computeDueDateFromPriority(CHECKLIST_PRIORITY.LOW, baseTime);
      expect(dueDate.toISOString()).toBe('2026-06-13T10:00:00.000Z');
    });
  });

  describe('applyChecklistDueDates', () => {
    it('sets dueDate from priority when dueDate is omitted', () => {
      const checklist = applyChecklistDueDates(
        [{ priority: CHECKLIST_PRIORITY.HIGH, user: 'agent-1' }],
        baseTime
      );

      expect(checklist[0].dueDate.toISOString()).toBe('2026-06-12T10:15:00.000Z');
    });

    it('keeps explicit dueDate when provided', () => {
      const customDueDate = new Date('2026-07-01T12:00:00.000Z');
      const checklist = applyChecklistDueDates(
        [{ priority: CHECKLIST_PRIORITY.HIGH, dueDate: customDueDate }],
        baseTime
      );

      expect(checklist[0].dueDate).toEqual(customDueDate);
    });

    it('returns checklist unchanged when empty', () => {
      expect(applyChecklistDueDates([], baseTime)).toEqual([]);
      expect(applyChecklistDueDates(undefined, baseTime)).toBeUndefined();
    });
  });
});
