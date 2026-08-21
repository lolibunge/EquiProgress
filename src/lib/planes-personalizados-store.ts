import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';

import { db, USE_FIRESTORE } from '@/lib/firebase';

// Un alumno puede: (a) activar uno de los planes que la instructora armó,
// o (b) armar el suyo guiado por lo que le cuesta a su caballo -- eso
// genera un `PlanPersonalizado` que reusa los ejercicios de un plan base
// del catálogo, pero con su propia frecuencia semanal.
//
// El plan activo es POR CABALLO, no uno solo por cuenta: un alumno (o la
// instructora) puede tener varios caballos entrenando en paralelo, cada
// uno con su propio plan. `activePlanesPorCaballo` vive en el documento
// del usuario como un mapa `{ [claveDeCaballo]: planId }`, donde
// `planId` es un id de plan del catálogo o, con el prefijo `custom-`, un
// `PlanPersonalizado`. `CLAVE_SIN_CABALLO` se usa para alumnos que
// todavía no cargaron ningún caballo.

export const CLAVE_SIN_CABALLO = 'general';

export type PlanPersonalizado = {
  id: string;
  planBaseId: string;
  nombre: string;
  diasEntrenoSemana: number[]; // días iso (1=lunes...7=domingo), ascendente
  caballoId: string | null;
  descripcionCaballo: string | null;
  resultadoDeseado: string | null;
  semanasObjetivo: number | null;
};

export function idActivoDePlanPersonalizado(planPersonalizadoId: string): string {
  return `custom-${planPersonalizadoId}`;
}

export function esIdDePlanPersonalizado(activePlanId: string | null): boolean {
  return Boolean(activePlanId?.startsWith('custom-'));
}

/** La clave con la que se guarda el plan activo de un caballo (o el general, si no hay). */
export function claveDeCaballo(caballoId: string | null): string {
  return caballoId ?? CLAVE_SIN_CABALLO;
}

const LOCAL_PLANES_KEY_PREFIX = 'equi:planesPersonalizados:';
const LOCAL_ACTIVE_PLANES_KEY_PREFIX = 'equi:activePlanesPorCaballo:';
const LOCAL_ACTIVE_PLAN_LEGACY_KEY_PREFIX = 'equi:activePlanId:';

function createId(): string {
  if (typeof window !== 'undefined' && window.crypto && 'randomUUID' in window.crypto) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function localPlanesKey(uid: string): string {
  return `${LOCAL_PLANES_KEY_PREFIX}${uid}`;
}

function localActivePlanesKey(uid: string): string {
  return `${LOCAL_ACTIVE_PLANES_KEY_PREFIX}${uid}`;
}

function localActivePlanLegacyKey(uid: string): string {
  return `${LOCAL_ACTIVE_PLAN_LEGACY_KEY_PREFIX}${uid}`;
}

function normalizeSemanasObjetivo(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function normalizeTextoOpcional(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readLocalPlanes(uid: string): PlanPersonalizado[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(localPlanesKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      id: String(item.id ?? ''),
      planBaseId: String(item.planBaseId ?? ''),
      nombre: String(item.nombre ?? ''),
      diasEntrenoSemana: Array.isArray(item.diasEntrenoSemana) ? item.diasEntrenoSemana : [1, 2, 3, 4, 5],
      caballoId: typeof item.caballoId === 'string' ? item.caballoId : null,
      descripcionCaballo: normalizeTextoOpcional(item.descripcionCaballo),
      resultadoDeseado: normalizeTextoOpcional(item.resultadoDeseado),
      semanasObjetivo: normalizeSemanasObjetivo(item.semanasObjetivo),
    }));
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
          caballoId: typeof data.caballoId === 'string' ? data.caballoId : null,
          descripcionCaballo: normalizeTextoOpcional(data.descripcionCaballo),
          resultadoDeseado: normalizeTextoOpcional(data.resultadoDeseado),
          semanasObjetivo: normalizeSemanasObjetivo(data.semanasObjetivo),
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
  args: {
    planBaseId: string;
    nombre: string;
    diasEntrenoSemana: number[];
    caballoId?: string | null;
    descripcionCaballo?: string | null;
    resultadoDeseado?: string | null;
    semanasObjetivo?: number | null;
  }
): Promise<PlanPersonalizado> {
  const plan: PlanPersonalizado = {
    id: createId(),
    planBaseId: args.planBaseId,
    nombre: args.nombre,
    diasEntrenoSemana: args.diasEntrenoSemana,
    caballoId: args.caballoId ?? null,
    descripcionCaballo: normalizeTextoOpcional(args.descripcionCaballo),
    resultadoDeseado: normalizeTextoOpcional(args.resultadoDeseado),
    semanasObjetivo: normalizeSemanasObjetivo(args.semanasObjetivo),
  };

  if (!db || !USE_FIRESTORE) {
    writeLocalPlanes(uid, [...readLocalPlanes(uid), plan]);
    return plan;
  }

  const planesCollection = collection(db, 'users', uid, 'planesPersonalizados');

  await setDoc(doc(planesCollection, plan.id), {
    planBaseId: plan.planBaseId,
    nombre: plan.nombre,
    diasEntrenoSemana: plan.diasEntrenoSemana,
    caballoId: plan.caballoId,
    descripcionCaballo: plan.descripcionCaballo,
    resultadoDeseado: plan.resultadoDeseado,
    semanasObjetivo: plan.semanasObjetivo,
    createdAt: serverTimestamp(),
  });

  return plan;
}

function normalizeActivePlanesMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};

  const mapa: Record<string, string> = {};
  for (const [clave, planId] of Object.entries(value as Record<string, unknown>)) {
    if (typeof planId === 'string' && planId) mapa[clave] = planId;
  }
  return mapa;
}

/**
 * Se suscribe al mapa `{ claveDeCaballo: planId }` de planes activos.
 * Si el usuario todavía tiene el `activePlanId` viejo (de antes de que el
 * plan fuera por caballo) y no tiene mapa nuevo, lo migramos en memoria a
 * `{ general: activePlanIdViejo }` para no perder la selección.
 */
export function subscribeActivePlanesPorCaballo(
  uid: string,
  onChange: (mapa: Record<string, string>) => void
): Unsubscribe {
  if (!uid) {
    onChange({});
    return () => undefined;
  }

  if (!db || !USE_FIRESTORE) {
    try {
      const raw = window.localStorage.getItem(localActivePlanesKey(uid));
      const mapa = raw ? normalizeActivePlanesMap(JSON.parse(raw)) : {};
      if (Object.keys(mapa).length === 0) {
        const legacy = window.localStorage.getItem(localActivePlanLegacyKey(uid));
        onChange(legacy ? { [CLAVE_SIN_CABALLO]: legacy } : {});
        return () => undefined;
      }
      onChange(mapa);
    } catch {
      onChange({});
    }
    return () => undefined;
  }

  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      const data = snapshot.data() as Record<string, unknown> | undefined;
      const mapa = normalizeActivePlanesMap(data?.activePlanesPorCaballo);

      if (Object.keys(mapa).length === 0 && typeof data?.activePlanId === 'string' && data.activePlanId) {
        onChange({ [CLAVE_SIN_CABALLO]: data.activePlanId });
        return;
      }

      onChange(mapa);
    },
    () => onChange({})
  );
}

export async function setActivePlanIdParaCaballo(uid: string, clave: string, planId: string): Promise<void> {
  if (!db || !USE_FIRESTORE) {
    try {
      const raw = window.localStorage.getItem(localActivePlanesKey(uid));
      const mapa = raw ? normalizeActivePlanesMap(JSON.parse(raw)) : {};
      mapa[clave] = planId;
      window.localStorage.setItem(localActivePlanesKey(uid), JSON.stringify(mapa));
    } catch {
      // Ignoramos fallos de almacenamiento local.
    }
    return;
  }

  await setDoc(
    doc(db, 'users', uid),
    { activePlanesPorCaballo: { [clave]: planId }, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** Mapea "cuántos días por semana" a qué días iso de la semana entrena, con un patrón razonable. */
export function diasEntrenoParaCantidad(cantidad: number): number[] {
  const patrones: Record<number, number[]> = {
    1: [3],
    2: [2, 5],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
    6: [1, 2, 3, 4, 5, 6],
    7: [1, 2, 3, 4, 5, 6, 7],
  };

  return patrones[cantidad] ?? [1, 2, 3, 4, 5];
}
