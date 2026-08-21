import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';

import { db, USE_FIRESTORE } from '@/lib/firebase';

// Un alumno puede tener más de un caballo activo. Cada sesión (ver
// `sesiones-store.ts`) puede referenciar un `caballoId` opcional.

export type Caballo = {
  id: string;
  nombre: string;
};

const LOCAL_KEY_PREFIX = 'equi:caballos:';

function createId() {
  if (typeof window !== 'undefined' && window.crypto && 'randomUUID' in window.crypto) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function localKey(uid: string) {
  return `${LOCAL_KEY_PREFIX}${uid}`;
}

function readLocalCaballos(uid: string): Caballo[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(localKey(uid));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalCaballos(uid: string, caballos: Caballo[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(localKey(uid), JSON.stringify(caballos));
  } catch {
    // Ignoramos fallos de almacenamiento local (modo privado, cuota, etc.).
  }
}

/** Se suscribe a los caballos del alumno. Con Firestore desactivado, cae a localStorage. */
export function subscribeCaballos(uid: string, onChange: (caballos: Caballo[]) => void): Unsubscribe {
  if (!uid) {
    onChange([]);
    return () => undefined;
  }

  if (!db || !USE_FIRESTORE) {
    onChange(readLocalCaballos(uid));
    return () => undefined;
  }

  const caballosQuery = query(collection(db, 'users', uid, 'caballos'), orderBy('nombre', 'asc'));

  return onSnapshot(
    caballosQuery,
    (snapshot) => {
      const caballos = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        return {
          id: docSnap.id,
          nombre: String(data.nombre ?? ''),
        } satisfies Caballo;
      });

      onChange(caballos);
    },
    () => {
      onChange(readLocalCaballos(uid));
    }
  );
}

export async function crearCaballo(uid: string, nombre: string): Promise<Caballo> {
  const nombreLimpio = nombre.trim();

  if (!db || !USE_FIRESTORE) {
    const caballo: Caballo = { id: createId(), nombre: nombreLimpio };
    writeLocalCaballos(uid, [...readLocalCaballos(uid), caballo]);
    return caballo;
  }

  const docRef = await addDoc(collection(db, 'users', uid, 'caballos'), {
    nombre: nombreLimpio,
    createdAt: serverTimestamp(),
  });

  return { id: docRef.id, nombre: nombreLimpio };
}
