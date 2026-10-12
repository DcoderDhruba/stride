import { Linking, Platform } from 'react-native';
import { localDate, startOfDay } from './tracker';

type HealthConnect = typeof import('react-native-health-connect');
export type HealthStatus = 'unavailable' | 'needs-install' | 'needs-permission' | 'ready';
const STEPS = { accessType: 'read', recordType: 'Steps' } as const;
const PROVIDER = 'com.google.android.apps.healthdata';

// Loaded lazily: the native module is missing in Expo Go and on iOS/web, and importing it there throws.
let module: HealthConnect | null | undefined;
function load(): HealthConnect | null {
  if (module === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    try { module = Platform.OS === 'android' ? require('react-native-health-connect') : null; } catch { module = null; }
  }
  return module ?? null;
}

export async function healthConnectStatus(): Promise<HealthStatus> {
  const hc = load();
  if (!hc) return 'unavailable';
  const sdk = await hc.getSdkStatus();
  if (sdk === hc.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs-install';
  if (sdk !== hc.SdkAvailabilityStatus.SDK_AVAILABLE || !(await hc.initialize())) return 'unavailable';
  return (await hc.getGrantedPermissions()).some(p => 'recordType' in p && p.recordType === 'Steps' && p.accessType === 'read') ? 'ready' : 'needs-permission';
}

/** Shows the Health Connect permission sheet. Returns true if step access was granted. */
export async function requestStepsAccess(): Promise<boolean> {
  const hc = load();
  if (!hc) return false;
  return (await hc.requestPermission([STEPS])).some(p => 'recordType' in p && p.recordType === 'Steps');
}

/** Daily step totals for today and the previous `days - 1` days, keyed by local date. */
export async function readDailySteps(days = 7): Promise<Record<string, number>> {
  const hc = load();
  if (!hc) return {};
  const result: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const start = startOfDay(); start.setDate(start.getDate() - i);
    const end = i === 0 ? new Date() : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    const { COUNT_TOTAL } = await hc.aggregateRecord({ recordType: 'Steps', timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() } });
    result[localDate(start)] = COUNT_TOTAL;
  }
  return result;
}

export function openHealthConnect(status: HealthStatus) {
  if (status === 'needs-install') Linking.openURL(`market://details?id=${PROVIDER}&url=healthconnect%3A%2F%2Fonboarding`).catch(() => Linking.openURL(`https://play.google.com/store/apps/details?id=${PROVIDER}`));
  else load()?.openHealthConnectSettings();
}
