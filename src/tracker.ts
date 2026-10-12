export type Workout = { id: string; title: string; tag: string; minutes: number; kcal: number; image: string | number; exercises: string[] };
export type Session = { id: string; title: string; minutes: number; seconds: number; kcal: number; date: string };
export type Data = { date: string; water: number; steps: number; stepGoal: number; waterGoal: number; name: string; sessions: Session[]; sample: boolean; autoSteps: boolean; extraSteps: number; stepHistory: Record<string, number> };
export function localDate(date = new Date()): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function defaultData(date = new Date()): Data { return { date: localDate(date), water: 3, steps: 6840, stepGoal: 10000, waterGoal: 8, name: 'Alex', sessions: [], sample: true, autoSteps: true, extraSteps: 0, stepHistory: {} }; }
export function startOfDay(date = new Date()): Date { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; }
/** Moves a finished day's steps into history and starts the new day at zero. History keeps the last 30 days. */
export function rollover(d: Data, date = new Date()): Data {
  if (d.date === localDate(date)) return d;
  const history = d.sample ? d.stepHistory : { ...d.stepHistory, [d.date]: d.steps };
  const stepHistory = Object.fromEntries(Object.entries(history).sort(([a], [b]) => a.localeCompare(b)).slice(-30));
  return { ...d, date: localDate(date), steps: 0, water: 0, extraSteps: 0, sample: false, stepHistory };
}
const STRIDE_KM = 0.000762, KCAL_PER_STEP = 0.04;
export function stepStats(steps: number) { return { km: Math.round(steps * STRIDE_KM * 10) / 10, kcal: Math.round(steps * KCAL_PER_STEP) }; }
export function validateGoals(name: string, steps: number, water: number): string | null {
  if (!name.trim()) return 'Please enter your name.';
  if (!Number.isInteger(steps) || steps < 100 || steps > 100000) return 'Choose a step goal between 100 and 100,000.';
  if (!Number.isInteger(water) || water < 1 || water > 30) return 'Choose a water goal between 1 and 30 glasses.';
  return null;
}
export function normalizeData(value: unknown, date = new Date()): Data {
  const d = value as Data;
  if (!d || typeof d.name !== 'string' || validateGoals(d.name, d.stepGoal, d.waterGoal) || !Array.isArray(d.sessions) || !Number.isInteger(d.steps) || d.steps < 0 || !Number.isInteger(d.water) || d.water < 0 || typeof d.date !== 'string') throw new Error('Invalid saved data');
  const sessions = d.sessions.filter(x => x && typeof x.id === 'string' && typeof x.title === 'string' && typeof x.date === 'string' && Number.isFinite(x.seconds) && x.seconds > 0 && Number.isFinite(x.minutes) && x.minutes >= 0 && Number.isFinite(x.kcal) && x.kcal >= 0);
  const history = d.stepHistory && typeof d.stepHistory === 'object' ? d.stepHistory : {};
  const stepHistory = Object.fromEntries(Object.entries(history).filter(([k, v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isInteger(v) && v >= 0));
  return rollover({ ...defaultData(date), ...d, sessions, stepHistory, autoSteps: d.autoSteps !== false, extraSteps: Number.isInteger(d.extraSteps) && d.extraSteps >= 0 ? d.extraSteps : 0 }, date);
}
export function completeSession(data: Data, workout: Workout, seconds: number, date = new Date()): Data {
  const elapsed = Math.max(1, Math.floor(seconds));
  const session: Session = { id: `${date.getTime()}-${Math.random().toString(36).slice(2, 8)}`, title: workout.title, seconds: elapsed, minutes: Math.round(elapsed / 60 * 10) / 10, kcal: Math.round(workout.kcal * Math.min(elapsed / (workout.minutes * 60), 1)), date: localDate(date) };
  return { ...data, sessions: [session, ...data.sessions] };
}
export function buildWeek(sessions: Session[], now = new Date()) {
  return Array.from({ length: 7 }, (_, i) => { const day = new Date(now); day.setDate(day.getDate() - (6 - i)); const date = localDate(day); return { date, label: day.toLocaleDateString('en-US', { weekday: 'short' }), minutes: Math.round(sessions.filter(x => x.date === date).reduce((a, x) => a + x.minutes, 0) * 10) / 10 }; });
}
export function buildStepWeek(data: Data, now = new Date()) {
  return Array.from({ length: 7 }, (_, i) => { const day = new Date(now); day.setDate(day.getDate() - (6 - i)); const date = localDate(day); return { date, label: day.toLocaleDateString('en-US', { weekday: 'short' }), steps: date === data.date ? data.steps : data.stepHistory[date] ?? 0 }; });
}
export function stepStreak(data: Data, now = new Date()) {
  const today = localDate(now), activeToday = data.date === today && !data.sample && data.steps >= data.stepGoal;
  let days = 0;
  for (let offset = 0; offset < 30; offset++) {
    const date = new Date(now);
    date.setDate(date.getDate() - offset);
    const key = localDate(date);
    const steps = key === today
      ? (activeToday ? data.steps : 0)
      : data.stepHistory[key] ?? 0;
    if (steps < data.stepGoal) {
      if (offset === 0 && !activeToday) continue;
      break;
    }
    days++;
  }
  const nextMilestone = [3, 7, 14, 30].find(milestone => milestone > days) ?? 30;
  return { days, activeToday, nextMilestone, progress: Math.min(days / nextMilestone, 1) };
}
