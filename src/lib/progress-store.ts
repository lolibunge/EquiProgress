import {
  addDoc,
  collection,
  doc,
  getDoc,
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
  maxEntries = 100
): Unsubscribe {
  if (!db || !USE_FIRESTORE) {
    onChange([]);
    return () => undefined;
  }

  const historyQuery = query(
    collection(db, 'users', uid, 'history'),
    orderBy('createdAt', 'desc'),
    limit(maxEntries)
  );

  return onSnapshot(historyQuery, (snapshot) => {
    const entries = snapshot.docs.map((docSnap) => {
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

    onChange(entries);
  });
}

function toDate(value: unknown): Date | null {
  if (typeof value !== 'object' || value === null) return null;

  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate === 'function') {
    return maybeTimestamp.toDate();
  }

  return null;
}

function normalizeAction(value: unknown): ProgressAction {
  const safeAction = String(value ?? '') as ProgressAction;

  if (safeAction in PROGRESS_ACTION_LABELS) {
    return safeAction;
  }

  return 'week_selected';
}
