import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { localDate, startOfDay } from './tracker';
import { healthConnectStatus, openHealthConnect, readDailySteps, requestStepsAccess, type HealthStatus } from './healthConnect';

export type StepStatus = 'off' | 'checking' | 'live' | 'denied' | 'unavailable';
export type StepSource = 'motion' | 'health-connect';
type Handlers = {
  /** iOS: today's exact total from Core Motion, including steps taken while the app was closed. */
  onTotal: (steps: number) => void;
  /** Android + Health Connect: today's total recorded by the phone or fitness apps. Never lowers the count. */
  onFloor: (steps: number) => void;
  /** Android pedometer: new steps since the last update. Only counted while the app is open. */
  onDelta: (steps: number) => void;
  /** Totals for previous days. */
  onHistory: (history: Record<string, number>) => void;
};
const HEALTH_REFRESH_MS = 2 * 60 * 1000;

export function useStepCounter(enabled: boolean, date: string, handlers: Handlers) {
  const [sensorStatus, setStatus] = useState<StepStatus>('checking');
  const [health, setHealth] = useState<HealthStatus>('unavailable'), [source, setSource] = useState<StepSource>('motion');
  const [session, setSession] = useState(0);
  // Each system prompt is shown automatically once per app launch; after that the user opts in from the UI.
  const canAskAgain = useRef(true), askedMotion = useRef(false), askedHealth = useRef(false), cb = useRef(handlers);
  useEffect(() => { cb.current = handlers; });

  // Re-sync when the app returns to the foreground: pedometer updates stop in the background.
  useEffect(() => { const sub = AppState.addEventListener('change', state => { if (state === 'active') setSession(n => n + 1); }); return () => sub.remove(); }, []);

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    let cancelled = false, sub: { remove: () => void } | undefined, timer: ReturnType<typeof setInterval> | undefined;
    (async () => {
      try {
        let healthReady = false;
        if (Platform.OS === 'android') {
          let hs = await healthConnectStatus().catch((): HealthStatus => 'unavailable');
          if (hs === 'needs-permission' && !askedHealth.current) { askedHealth.current = true; if (await requestStepsAccess().catch(() => false)) hs = 'ready'; }
          if (cancelled) return;
          setHealth(hs);
          if (hs === 'ready') {
            const daily = await readDailySteps(7).catch(() => null);
            if (cancelled) return;
            if (daily) {
              healthReady = true;
              const { [localDate()]: today = 0, ...history } = daily;
              cb.current.onFloor(today); cb.current.onHistory(history);
              timer = setInterval(() => { readDailySteps(1).then(d => { if (!cancelled) cb.current.onFloor(d[localDate()] ?? 0); }).catch(() => {}); }, HEALTH_REFRESH_MS);
            }
          }
          setSource(healthReady ? 'health-connect' : 'motion');
        }

        const sensor = await Pedometer.isAvailableAsync().catch(() => false);
        let perm = sensor ? await Pedometer.getPermissionsAsync() : null;
        if (perm && !perm.granted && perm.canAskAgain && !askedMotion.current) { askedMotion.current = true; perm = await Pedometer.requestPermissionsAsync(); }
        if (perm) canAskAgain.current = perm.canAskAgain;
        if (cancelled) return;
        if (!perm?.granted) { setStatus(healthReady ? 'live' : perm ? 'denied' : 'unavailable'); return; }

        if (Platform.OS === 'ios') {
          const { steps: base } = await Pedometer.getStepCountAsync(startOfDay(), new Date());
          if (cancelled) return;
          cb.current.onTotal(base);
          sub = Pedometer.watchStepCount(r => cb.current.onTotal(base + r.steps));
          setStatus('live');
          const history: Record<string, number> = {};
          for (let i = 1; i <= 6; i++) {
            const start = startOfDay(); start.setDate(start.getDate() - i);
            const end = new Date(start); end.setDate(end.getDate() + 1);
            history[localDate(start)] = (await Pedometer.getStepCountAsync(start, end)).steps;
          }
          if (!cancelled) cb.current.onHistory(history);
        } else {
          // Live steps while the app is open. With Health Connect these top up the synced total between refreshes.
          let last = 0;
          sub = Pedometer.watchStepCount(r => { const delta = r.steps - last; last = r.steps; if (delta > 0) cb.current.onDelta(delta); });
          cb.current.onDelta(0); // replaces sample steps with real counting from zero
          setStatus('live');
        }
      } catch { if (!cancelled) setStatus('unavailable'); }
    })();
    return () => { cancelled = true; sub?.remove(); if (timer) clearInterval(timer); };
  }, [enabled, date, session]);

  /** Ask for motion access again, or open system settings if the user blocked the prompt. */
  const retry = useCallback(() => { if (!canAskAgain.current) Linking.openSettings(); else { askedMotion.current = false; setSession(n => n + 1); } }, []);
  /** Install Health Connect, or show its permission sheet again. */
  const connectHealth = useCallback(() => {
    // Android stops showing the sheet after repeated denials, so fall back to Health Connect's own settings.
    if (health === 'needs-permission') requestStepsAccess().then(ok => ok ? setSession(n => n + 1) : openHealthConnect('ready')).catch(() => openHealthConnect('ready'));
    else openHealthConnect(health);
  }, [health]);

  const status: StepStatus = !enabled ? 'off' : Platform.OS === 'web' ? 'unavailable' : sensorStatus;
  const fullDay = Platform.OS === 'ios' || (Platform.OS === 'android' && source === 'health-connect');
  return { status, source, health, fullDay, retry, connectHealth };
}
