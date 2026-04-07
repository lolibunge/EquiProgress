'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

import { db, USE_FIRESTORE } from '@/lib/firebase';

type UserAccountMeta = {
  trialExtensionDays: number;
  lastFeedbackAt: Date | null;
  loading: boolean;
};

type InternalUserAccountMeta = Omit<UserAccountMeta, 'loading'> & {
  loading: boolean;
  resolved: boolean;
};

const DEFAULT_META: InternalUserAccountMeta = {
  trialExtensionDays: 0,
  lastFeedbackAt: null,
  loading: false,
  resolved: false,
};

export function useUserAccountMeta(user: User | null | undefined): UserAccountMeta {
  const [meta, setMeta] = useState<InternalUserAccountMeta>(DEFAULT_META);

  useEffect(() => {
    if (!user) {
      setMeta({
        ...DEFAULT_META,
        resolved: true,
      });
      return;
    }

    if (!db || !USE_FIRESTORE) {
      setMeta({
        trialExtensionDays: readLocalTrialExtensionDays(user.uid),
        lastFeedbackAt: readLocalFeedbackAt(user.uid),
        loading: false,
        resolved: true,
      });
      return;
    }

    setMeta((current) => ({ ...current, loading: true, resolved: false }));

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        const data = snapshot.data() as
          | {
              trialExtensionDays?: unknown;
              lastFeedbackAt?: unknown;
            }
          | undefined;

        setMeta({
          trialExtensionDays: parseNonNegativeInt(data?.trialExtensionDays),
          lastFeedbackAt: parseDateLike(data?.lastFeedbackAt),
          loading: false,
          resolved: true,
        });
      },
      () => {
        setMeta({
          trialExtensionDays: readLocalTrialExtensionDays(user.uid),
          lastFeedbackAt: readLocalFeedbackAt(user.uid),
          loading: false,
          resolved: true,
        });
      }
    );

    return unsubscribe;
  }, [user]);

  const waitingForFirstSnapshot = Boolean(user) && Boolean(db) && USE_FIRESTORE && !meta.resolved;

  return {
    trialExtensionDays: meta.trialExtensionDays,
    lastFeedbackAt: meta.lastFeedbackAt,
    loading: waitingForFirstSnapshot || meta.loading,
  };
}

function parseNonNegativeInt(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
}

function parseDateLike(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  if (typeof value === 'object' && value) {
    const maybeTimestamp = value as {
      toDate?: () => unknown;
      toMillis?: () => unknown;
    };

    if (typeof maybeTimestamp.toDate === 'function') {
      try {
        // Call as a bound method so Firestore Timestamp keeps its internal `this`.
        const converted = maybeTimestamp.toDate();
        if (converted instanceof Date && Number.isFinite(converted.getTime())) {
          return converted;
        }
      } catch {
        // Continues with other parsing strategies.
      }
    }

    if (typeof maybeTimestamp.toMillis === 'function') {
      try {
        const millis = Number(maybeTimestamp.toMillis());
        if (Number.isFinite(millis)) {
          const converted = new Date(millis);
          return Number.isFinite(converted.getTime()) ? converted : null;
        }
      } catch {
        // Ignore malformed timestamp-like values.
      }
    }
  }

  return null;
}

function readLocalFeedbackAt(uid: string): Date | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(`equi:lastFeedbackAt:${uid}`);
    return parseDateLike(raw);
  } catch {
    return null;
  }
}

function readLocalTrialExtensionDays(uid: string): number {
  if (typeof window === 'undefined') return 0;

  try {
    const raw = localStorage.getItem(`equi:trialExtensionDays:${uid}`);
    return parseNonNegativeInt(raw);
  } catch {
    return 0;
  }
}
