import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';

import { db, USE_FIRESTORE } from '@/lib/firebase';

export type SavedPlan = {
  startAt?: string | null;
  currentWeek: number;
  completedWeeks: number[];
  daysByWeek: Record<string, boolean[]>;
};

export type ProgressAction =
  | 'plan_started'
  | 'week_selected'
  | 'week_completed'
  | 'week_unmarked'
  | 'day_checked'
  | 'day_unchecked'
  | 'plan_reset';

export type ProgressHistoryEntry = {
  id: string;
  planId: string;
  planName: string;
  action: ProgressAction;
  week: number | null;
  currentWeek: number;
  completedWeeks: number[];
  note: string | null;
  createdAt: Date | null;
};

type StoredHistoryEntry = Omit<ProgressHistoryEntry, 'createdAt'> & {
  createdAtIso: string | null;
};

type SaveProgressArgs = {
  uid: string;
  planId: string;
  planName: string;
  progress: SavedPlan;
  event?: {
    action: ProgressAction;
    week?: number | null;
    note?: string | null;
  };
};

export type PlanProgressSummary = {
  planId: string;
  planName: string;
  startAt: string | null;
  currentWeek: number;
  completedWeeks: number[];
};

export const PROGRESS_ACTION_LABELS: Record<ProgressAction, string> = {
  plan_started: 'Plan iniciado',
  week_selected: 'Semana seleccionada',
  week_completed: 'Semana completada',
  week_unmarked: 'Semana reabierta',
  day_checked: 'Dia marcado',
  day_unchecked: 'Dia desmarcado',
  plan_reset: 'Plan reiniciado',
};

const EMPTY_PROGRESS: SavedPlan = {
  startAt: null,
  currentWeek: 0,
  completedWeeks: [],
  daysByWeek: {},
};

const LOCAL_HISTORY_KEY_PREFIX = 'equi:history:';

export function createEmptyProgress(): SavedPlan {
  return { ...EMPTY_PROGRESS, completedWeeks: [], daysByWeek: {} };
}

export function normalizeSavedPlan(input: Partial<SavedPlan> | undefined | null): SavedPlan {
  const completedWeeks = Array.isArray(input?.completedWeeks) ? input.completedWeeks : [];
  const rawDaysByWeek =
    input?.daysByWeek && typeof input.daysByWeek === 'object' ? input.daysByWeek : {};

  const daysByWeek = Object.entries(rawDaysByWeek).reduce<Record<string, boolean[]>>(
    (acc, [rawWeek, rawDays]) => {
      const week = Math.floor(Number(rawWeek));
      if (!Number.isFinite(week) || week <= 0) return acc;

      const sourceDays = Array.isArray(rawDays) ? rawDays : [];
      acc[String(week)] = Array.from({ length: 5 }, (_, index) => Boolean(sourceDays[index]));
      return acc;
    },
    {}
  );

  const normalizedCompletedWeeks = completedWeeks
    .map((week) => Number(week))
    .filter((week) => Number.isFinite(week) && week > 0)
    .sort((a, b) => a - b);

  for (const week of normalizedCompletedWeeks) {
    const key = String(week);
    if (!daysByWeek[key] || !daysByWeek[key].every(Boolean)) {
      daysByWeek[key] = Array.from({ length: 5 }, () => true);
    }
  }

  return {
    startAt: input?.startAt ?? null,
    currentWeek: Number.isFinite(input?.currentWeek) ? Math.max(0, Number(input?.currentWeek)) : 0,
    completedWeeks: normalizedCompletedWeeks,
    daysByWeek,
  };
}

export function mergeSavedPlanProgress(
  localInput: Partial<SavedPlan> | undefined | null,
  remoteInput: Partial<SavedPlan> | undefined | null
): SavedPlan {
  const local = normalizeSavedPlan(localInput);
  const remote = normalizeSavedPlan(remoteInput);

  const mergedWeeks = [...new Set([...local.completedWeeks, ...remote.completedWeeks])].sort(
    (a, b) => a - b
  );

  const allWeekKeys = [...new Set([...Object.keys(local.daysByWeek), ...Object.keys(remote.daysByWeek)])];
  const mergedDaysByWeek = allWeekKeys.reduce<Record<string, boolean[]>>((acc, key) => {
    const localDays = local.daysByWeek[key] ?? [];
    const remoteDays = remote.daysByWeek[key] ?? [];
    acc[key] = Array.from({ length: 5 }, (_, index) => Boolean(localDays[index] || remoteDays[index]));
    return acc;
  }, {});

  return normalizeSavedPlan({
    startAt: getEarliestStartAt(local.startAt ?? null, remote.startAt ?? null),
    currentWeek: Math.max(local.currentWeek, remote.currentWeek),
    completedWeeks: mergedWeeks,
    daysByWeek: mergedDaysByWeek,
  });
}

export function getSavedPlanFingerprint(input: Partial<SavedPlan> | undefined | null): string {
  const normalized = normalizeSavedPlan(input);
  const serializedDays = Object.entries(normalized.daysByWeek)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([week, days]) => `${week}:${days.map((day) => (day ? '1' : '0')).join('')}`)
    .join('|');

  return [
    normalized.startAt ?? '',
    normalized.currentWeek,
    normalized.completedWeeks.join(','),
    serializedDays,
  ].join('::');
}

export function readLocalPlanProgress(storageKey: string): SavedPlan {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return createEmptyProgress();
    return normalizeSavedPlan(JSON.parse(raw) as Partial<SavedPlan>);
  } catch {
    return createEmptyProgress();
  }
}

export function writeLocalPlanProgress(storageKey: string, progress: SavedPlan): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // Intentionally ignore storage write failures.
  }
}

export async function loadRemotePlanProgress(
  uid: string,
  planId: string
): Promise<SavedPlan | null> {
  if (!db || !USE_FIRESTORE) return null;

  const snap = await getDoc(doc(db, 'users', uid, 'planProgress', planId));
  if (!snap.exists()) return null;
  return normalizeSavedPlan(snap.data() as Partial<SavedPlan>);
}

export async function loadPlanProgressSummaries(uid: string): Promise<PlanProgressSummary[]> {
  if (!db || !USE_FIRESTORE || !uid) return [];

  const snapshot = await getDocs(collection(db, 'users', uid, 'planProgress'));

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Partial<SavedPlan> & {
      planId?: unknown;
      planName?: unknown;
    };
    const normalized = normalizeSavedPlan(data);

    return {
      planId: String(data.planId ?? docSnap.id),
      planName: String(data.planName ?? data.planId ?? docSnap.id),
      startAt: normalized.startAt ?? null,
      currentWeek: normalized.currentWeek,
      completedWeeks: normalized.completedWeeks,
    } satisfies PlanProgressSummary;
  });
}

export async function savePlanProgress({
  uid,
  planId,
  planName,
  progress,
  event,
}: SaveProgressArgs): Promise<void> {
  if (!db || !USE_FIRESTORE) return;

  const safeProgress = normalizeSavedPlan(progress);

  await setDoc(
    doc(db, 'users', uid, 'planProgress', planId),
    {
      planId,
      planName,
      startAt: safeProgress.startAt ?? null,
      currentWeek: safeProgress.currentWeek,
      completedWeeks: safeProgress.completedWeeks,
      daysByWeek: safeProgress.daysByWeek,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (!event) return;

  await addDoc(collection(db, 'users', uid, 'history'), {
    planId,
    planName,
    action: event.action,
    week: event.week ?? null,
    note: event.note ?? null,
    currentWeek: safeProgress.currentWeek,
    completedWeeks: safeProgress.completedWeeks,
    createdAt: serverTimestamp(),
  });
}

export function subscribeHistory(
  uid: string,
  onChange: (entries: ProgressHistoryEntry[]) => void,
  maxEntries = 100,
  onError?: (error: unknown) => void
): Unsubscribe {
  if (!uid) {
    onChange([]);
    return () => undefined;
  }

  if (!db || !USE_FIRESTORE) {
    onChange(readLocalHistory(uid, maxEntries));
    return () => undefined;
  }

  const historyQuery = query(
    collection(db, 'users', uid, 'history'),
    orderBy('createdAt', 'desc'),
    limit(maxEntries)
  );

  return onSnapshot(
    historyQuery,
    (snapshot) => {
      const cloudEntries = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;

        return {
          id: docSnap.id,
          planId: String(data.planId ?? ''),
          planName: String(data.planName ?? ''),
          action: normalizeAction(data.action),
          week: typeof data.week === 'number' ? data.week : null,
          currentWeek:
            typeof data.currentWeek === 'number'
              ? Math.max(0, Math.floor(data.currentWeek))
              : 0,
          completedWeeks: Array.isArray(data.completedWeeks)
            ? data.completedWeeks
                .map((week) => Number(week))
                .filter((week) => Number.isFinite(week) && week > 0)
                .sort((a, b) => a - b)
            : [],
          note: typeof data.note === 'string' ? data.note : null,
          createdAt: toDate(data.createdAt),
        } satisfies ProgressHistoryEntry;
      });

      const mergedEntries = mergeHistoryEntries(
        cloudEntries,
        readLocalHistory(uid, maxEntries)
      ).slice(0, maxEntries);

      onChange(mergedEntries);
    },
    (error) => {
      onError?.(error);
      onChange(readLocalHistory(uid, maxEntries));
    }
  );
}

export function appendLocalHistoryEntry(args: {
  uid: string;
  planId: string;
  planName: string;
  progress: SavedPlan;
  event: {
    action: ProgressAction;
    week?: number | null;
    note?: string | null;
  };
}): void {
  const { uid, planId, planName, progress, event } = args;
  if (!uid) return;

  const entry: ProgressHistoryEntry = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    planId,
    planName,
    action: event.action,
    week: event.week ?? null,
    currentWeek: progress.currentWeek,
    completedWeeks: [...progress.completedWeeks],
    note: event.note ?? null,
    createdAt: new Date(),
  };

  const current = readLocalHistory(uid, 500);
  const next = [entry, ...current].slice(0, 500);
  writeLocalHistory(uid, next);
}

export function readLocalHistory(uid: string, maxEntries = 100): ProgressHistoryEntry[] {
  if (!uid) return [];

  try {
    const raw = localStorage.getItem(getLocalHistoryKey(uid));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as StoredHistoryEntry[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        const { createdAtIso, ...rest } = entry;
        return {
          ...rest,
          createdAt: createdAtIso ? new Date(createdAtIso) : null,
        };
      })
      .filter((entry) => entry.planId && entry.action)
      .sort((a, b) => {
        const aTime = a.createdAt?.getTime() ?? 0;
        const bTime = b.createdAt?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, maxEntries);
  } catch {
    return [];
  }
}

function toDate(value: unknown): Date | null {
  if (typeof value !== 'object' || value === null) return null;

  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate === 'function') {
    return maybeTimestamp.toDate();
  }

  return null;
}

function getLocalHistoryKey(uid: string): string {
  return `${LOCAL_HISTORY_KEY_PREFIX}${uid}`;
}

function writeLocalHistory(uid: string, entries: ProgressHistoryEntry[]): void {
  try {
    const serialized: StoredHistoryEntry[] = entries.map((entry) => {
      const { createdAt, ...rest } = entry;
      return {
        ...rest,
        createdAtIso: createdAt ? createdAt.toISOString() : null,
      };
    });
    localStorage.setItem(getLocalHistoryKey(uid), JSON.stringify(serialized));
  } catch {
    // Ignorar fallos de almacenamiento local.
  }
}

function mergeHistoryEntries(
  primary: ProgressHistoryEntry[],
  secondary: ProgressHistoryEntry[]
): ProgressHistoryEntry[] {
  const merged = [...primary];
  const fingerprints = new Set(primary.map(getHistoryFingerprint));

  for (const entry of secondary) {
    const fingerprint = getHistoryFingerprint(entry);
    if (fingerprints.has(fingerprint)) continue;

    fingerprints.add(fingerprint);
    merged.push(entry);
  }

  return merged.sort((a, b) => {
    const aTime = a.createdAt?.getTime() ?? 0;
    const bTime = b.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

function getHistoryFingerprint(entry: ProgressHistoryEntry): string {
  const createdAt = entry.createdAt?.getTime() ?? 0;
  return [
    entry.planId,
    entry.action,
    entry.week ?? '',
    entry.currentWeek,
    entry.completedWeeks.join(','),
    createdAt,
  ].join('|');
}

function getEarliestStartAt(a: string | null, b: string | null): string | null {
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;

  const aMs = new Date(a).getTime();
  const bMs = new Date(b).getTime();

  if (!Number.isFinite(aMs)) return b;
  if (!Number.isFinite(bMs)) return a;
  return aMs <= bMs ? a : b;
}

function normalizeAction(value: unknown): ProgressAction {
  const safeAction = String(value ?? '') as ProgressAction;

  if (safeAction in PROGRESS_ACTION_LABELS) {
    return safeAction;
  }

  return 'week_selected';
}
