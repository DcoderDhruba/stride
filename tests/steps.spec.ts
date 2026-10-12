import { test, expect } from '@playwright/test';
import { buildStepWeek, defaultData, normalizeData, rollover, stepStats, stepStreak } from '../src/tracker';
test('rollover archives real steps into history and skips sample steps', () => {
  const day1 = { ...defaultData(new Date(2026, 9, 4)), steps: 9200, sample: false, extraSteps: 300 };
  const next = rollover(day1, new Date(2026, 9, 5, 8));
  expect(next.steps).toBe(0); expect(next.extraSteps).toBe(0); expect(next.stepHistory['2026-10-04']).toBe(9200);
  expect(rollover(defaultData(new Date(2026, 9, 4)), new Date(2026, 9, 5)).stepHistory).toEqual({});
  expect(rollover(next, new Date(2026, 9, 5, 20))).toBe(next);
});
test('history is capped at 30 days and old saves without step fields still load', () => {
  let d = { ...defaultData(new Date(2026, 0, 1)), sample: false };
  for (let i = 1; i <= 40; i++) d = { ...rollover(d, new Date(2026, 0, 1 + i)), steps: i };
  expect(Object.keys(d.stepHistory)).toHaveLength(30);
  const { autoSteps, extraSteps, stepHistory, ...legacy } = defaultData(new Date(2026, 9, 5));
  const loaded = normalizeData(legacy, new Date(2026, 9, 5));
  expect(loaded.autoSteps).toBe(true); expect(loaded.extraSteps).toBe(0); expect(loaded.stepHistory).toEqual({});
  expect(normalizeData({ ...legacy, stepHistory: { bad: 5, '2026-10-01': -1, '2026-10-02': 4000 } }, new Date(2026, 9, 5)).stepHistory).toEqual({ '2026-10-02': 4000 });
});
test('step week uses today and history; stats estimate distance and calories', () => {
  const data = { ...defaultData(new Date(2026, 9, 5)), steps: 1200, stepHistory: { '2026-10-03': 8000, '2026-09-01': 5 } };
  const week = buildStepWeek(data, new Date(2026, 9, 5));
  expect(week).toHaveLength(7); expect(week[6].steps).toBe(1200); expect(week[4].steps).toBe(8000); expect(week.reduce((a, d) => a + d.steps, 0)).toBe(9200);
  expect(stepStats(10000)).toEqual({ km: 7.6, kcal: 400 });
});
test('step streak counts consecutive goals, milestones, and an incomplete current day correctly', () => {
  const today = new Date(2026, 9, 5);
  const data = { ...defaultData(today), sample: false, steps: 10000, stepHistory: { '2026-10-04': 10000, '2026-10-03': 10000 } };
  expect(stepStreak(data, today)).toEqual({ days: 3, activeToday: true, nextMilestone: 7, progress: 3 / 7 });
  expect(stepStreak({ ...data, steps: 2000 }, today)).toEqual({ days: 2, activeToday: false, nextMilestone: 3, progress: 2 / 3 });
  expect(stepStreak({ ...data, sample: true }, today)).toEqual({ days: 2, activeToday: false, nextMilestone: 3, progress: 2 / 3 });
  expect(stepStreak({ ...data, steps: 0, stepHistory: { '2026-10-04': 10000, '2026-10-02': 10000 } }, today).days).toBe(1);
});
