import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';

import { db, USE_FIRESTORE } from '@/lib/firebase';

// Un alumno puede: (a) activar uno de los planes que la instructora armó,
// o (b) armar el suyo guiado por lo que le cuesta a su caballo -- eso
// genera un `PlanPersonalizado` que reusa los ejercicios de un plan base
// del catálogo, pero con su propia frecuencia semanal. `activePlanId`
// vive en el documento del usuario y apunta a un id de plan del catálogo
// o, con el prefijo `custom-`, a un `PlanPersonalizado`.

export type PlanPersonalizado = {
  id: string;
  planBaseId: string;
  nombre: string;
  diasEntrenoSemana: number[]; // días iso (1=lunes...7=domingo), ascendente
};

export function idActivoDePlanPersonalizado(planPersonalizadoId: string): string {
  return `custom-${planPersonalizadoId}`;
}

export function esIdDePlanPersonalizado(activePlanId: string | null): boolean {
  return Boolean(activePlanId?.startsWith('custom-'));
}

const LOCAL_PLANES_KEY_PREFIX = 'equi:planesPersonalizados:';
const LOCAL_ACTIVE_PLAN_KEY_PREFIX = 'equi:activePlanId:';

function createId(): string {
  if (typeof window !== 'undefined' && window.crypto && 'randomUUID' in window.crypto) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function localPlanesKey(uid: string): string {
  return `${LOCAL_PLANES_KEY_PREFIX}${uid}`;
}

function localActivePlanKey(uid: string): string {
  return `${LOCAL_ACTIVE_PLAN_KEY_PREFIX}${uid}`;
}

function readLocalPlanes(uid: string): PlanPersonalizado[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(localPlanesKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalPlanes(uid: string, planes: PlanPersonalizado[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(localPlanesKey(uid), JSON.stringify(planes));
  } catch {
    // Ignoramos fallos de almacenamiento local.
  }
}

export function subscribePlanesPersonalizados(
  uid: string,
  onChange: (planes: PlanPersonalizado[]) => void
): Unsubscribe {
  if (!uid) {
    onChange([]);
    return () => undefined;
  }

  if (!db || !USE_FIRESTORE) {
    onChange(readLocalPlanes(uid));
    return () => undefined;
  }

  const planesQuery = query(collection(db, 'users', uid, 'planesPersonalizados'), orderBy('nombre', 'asc'));

  return onSnapshot(
    planesQuery,
    (snapshot) => {
      const planes = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        return {
          id: docSnap.id,
          planBaseId: String(data.planBaseId ?? ''),
          nombre: String(data.nombre ?? ''),
          diasEntrenoSemana: Array.isArray(data.diasEntrenoSemana)
            ? data.diasEntrenoSemana.filter((dia): dia is number => typeof dia === 'number')
            : [1, 2, 3, 4, 5],
        } satisfies PlanPersonalizado;
      });

      onChange(planes);
    },
    () => {
      onChange(readLocalPlanes(uid));
    }
  );
}

export async function crearPlanPersonalizado(
  uid: string,
  args: { planBaseId: string; nombre: string; diasEntrenoSemana: number[] }
): Promise<PlanPersonalizado> {
  if (!db || !USE_FIRESTORE) {
    const plan: PlanPersonalizado = { id: createId(), ...args };
    writeLocalPlanes(uid, [...readLocalPlanes(uid), plan]);
    return plan;
  }

  const planesCollection = collection(db, 'users', uid, 'planesPersonalizados');
  const id = createId();

  await setDoc(doc(planesCollection, id), {
    planBaseId: args.planBaseId,
    nombre: args.nombre,
    diasEntrenoSemana: args.diasEntrenoSemana,
    createdAt: serverTimestamp(),
  });

  return { id, planBaseId: args.planBaseId, nombre: args.nombre, diasEntrenoSemana: args.diasEntrenoSemana };
}

export function subscribeActivePlanId(uid: string, onChange: (planId: string | null) => void): Unsubscribe {
  if (!uid) {
    onChange(null);
    return () => undefined;
  }

  if (!db || !USE_FIRESTORE) {
    try {
      onChange(window.localStorage.getItem(localActivePlanKey(uid)));
    } catch {
      onChange(null);
    }
    return () => undefined;
  }

  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      const data = snapshot.data() as Record<string, unknown> | undefined;
      const activePlanId = typeof data?.activePlanId === 'string' ? data.activePlanId : null;
      onChange(activePlanId);
    },
    () => onChange(null)
  );
}

export async function setActivePlanId(uid: string, planId: string): Promise<void> {
  if (!db || !USE_FIRESTORE) {
    try {
      window.localStorage.setItem(localActivePlanKey(uid), planId);
    } catch {
      // Ignoramos fallos de almacenamiento local.
    }
    return;
  }

  await setDoc(doc(db, 'users', uid), { activePlanId: planId, updatedAt: serverTimestamp() }, { merge: true });
}

/** Mapea "cuántos días por semana" a qué días iso de la semana entrena, con un patrón razonable. */
export function diasEntrenoParaCantidad(cantidad: number): number[] {
  const patrones: Record<number, number[]> = {
    1: [3],
    2: [2, 5],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
  };

  return patrones[cantidad] ?? [1, 2, 3, 4, 5];
}
