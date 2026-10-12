import { test, expect } from '@playwright/test';
import { buildWeek, completeSession, defaultData, normalizeData, validateGoals, type Workout } from '../src/tracker';
const date = new Date(2026, 9, 5, 12);
const workout: Workout = { id: 'test', title: 'Yoga', tag: 'YOGA', minutes: 15, kcal: 60, image: '', exercises: [] };
test('daily rollover resets totals and preserves history and goals', () => {
  const data = completeSession(defaultData(new Date(2026, 9, 4)), workout, 600, new Date(2026, 9, 4));
  const reset = normalizeData(data, date);
  expect(reset.steps).toBe(0); expect(reset.water).toBe(0); expect(reset.sessions).toHaveLength(1); expect(reset.stepGoal).toBe(10000); expect(reset.sample).toBe(false);
});
test('partial sessions use elapsed duration and weekly totals exclude old sessions', () => {
  const data = completeSession(defaultData(date), workout, 450, date);
  expect(data.sessions[0].minutes).toBe(7.5); expect(data.sessions[0].kcal).toBe(30);
  const withOld = completeSession(data, workout, 900, new Date(2026, 8, 1));
  expect(buildWeek(withOld.sessions, date).reduce((a, x) => a + x.minutes, 0)).toBe(7.5);
});
test('invalid goals and corrupted storage are rejected', () => {
  expect(validateGoals('Sam', 10000, 8)).toBeNull();
  expect(validateGoals('', 10000, 8)).not.toBeNull();
  expect(validateGoals('Sam', NaN, 8)).not.toBeNull();
  expect(validateGoals('Sam', 10000, 0)).not.toBeNull();
  expect(() => normalizeData({ ...defaultData(), stepGoal: 0 })).toThrow();
});
