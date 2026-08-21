import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { db, USE_FIRESTORE } from '@/lib/firebase';
import type { TrainingPlan } from '@/data/training-plans';
import { getPlanDayExercises } from '@/data/training-plans';

// Modelo unificado de registro diario (ver el análisis "EquiProgress ×
// Move"). Reemplaza los dos sistemas viejos -- `progress-store.ts`
// (semana/día abstracto) y `session-registry-store.ts` (diario suelto,
// solo local) -- por un único registro anclado siempre a una fecha real de
// calendario, sincronizado a Firestore para que la instructora lo vea.

export type SesionRating = 1 | 2 | 3 | 4 | 5;
export type SesionOrigen = 'plan' | 'personalizada';

export type SesionEntry = {
  id: string;
  fecha: string; // "YYYY-MM-DD" en horario local del dispositivo
  origen: SesionOrigen;
  planId: string | null;
  ejercicioId: string | null;
  caballoId: string | null;
  titulo: string;
  completada: boolean;
  calificacion: SesionRating | null;
  nota: string | null;
  xp: number;
  createdAt: string | null;
  updatedAt: string | null;
};

const XP_POR_SESION = 15;
export const DIAS_ENTRENO_POR_DEFECTO = [1, 2, 3, 4, 5] as const;
const LOCAL_KEY_PREFIX = 'equi:sesiones:';

// --- Fechas -----------------------------------------------------------
// Usamos los componentes locales del reloj del dispositivo (no
// toISOString(), que convierte a UTC y corre el día en husos negativos
// como el nuestro) -- mismo criterio que usa Move para esto.

export function hoyFecha(): string {
  return fechaDeDate(new Date());
}

export function fechaDeDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function sumarDias(fecha: string, dias: number): string {
  const [year, month, day] = fecha.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() + dias);
  return fechaDeDate(date);
}

/** 1 = lunes ... 7 = domingo, en horario local (no UTC). */
export function diaIsoDeSemana(fecha: string): number {
  const [year, month, day] = fecha.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  const domingoEsCero = date.getDay();
  return domingoEsCero === 0 ? 7 : domingoEsCero;
}

/**
 * Posición (1-based) de `fecha` dentro de los días de entreno de la
 * semana del plan (p. ej. con [1,3,5] lunes es día 1, miércoles día 2,
 * viernes día 3). `null` si `fecha` cae en un día de descanso.
 */
export function posicionDiaDeEntreno(fecha: string, diasEntrenoSemana: readonly number[]): number | null {
  const diaIso = diaIsoDeSemana(fecha);
  const index = diasEntrenoSemana.indexOf(diaIso);
  return index === -1 ? null : index + 1;
}

function createId(): string {
  if (typeof window !== 'undefined' && window.crypto && 'randomUUID' in window.crypto) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// --- Almacenamiento local (respaldo sin Firestore) ---------------------

function localKey(uid: string): string {
  return `${LOCAL_KEY_PREFIX}${uid}`;
}

function readLocalSesiones(uid: string): SesionEntry[] {
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

function writeLocalSesiones(uid: string, sesiones: SesionEntry[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(localKey(uid), JSON.stringify(sesiones));
  } catch {
    // Ignoramos fallos de almacenamiento local (modo privado, cuota, etc.).
  }
}

function upsertLocal(uid: string, entry: SesionEntry): void {
  const current = readLocalSesiones(uid);
  const next = current.some((item) => item.id === entry.id)
    ? current.map((item) => (item.id === entry.id ? entry : item))
    : [...current, entry];
  writeLocalSesiones(uid, next);
}

// --- Lectura -------------------------------------------------------------

/**
 * Se suscribe a las sesiones guardadas entre `fechaInicio` y `fechaFin`
 * (incluidas). Como `fecha` es "YYYY-MM-DD", el orden lexicográfico ya es
 * el orden cronológico -- no hace falta parsear nada para el rango.
 */
export function subscribeSesionesRango(
  uid: string,
  fechaInicio: string,
  fechaFin: string,
  onChange: (sesiones: SesionEntry[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  if (!uid) {
    onChange([]);
    return () => undefined;
  }

  const filtrarLocal = () =>
    readLocalSesiones(uid).filter((sesion) => sesion.fecha >= fechaInicio && sesion.fecha <= fechaFin);

  if (!db || !USE_FIRESTORE) {
    onChange(filtrarLocal());
    return () => undefined;
  }

  const sesionesQuery = query(
    collection(db, 'users', uid, 'sesiones'),
    where('fecha', '>=', fechaInicio),
    where('fecha', '<=', fechaFin)
  );

  return onSnapshot(
    sesionesQuery,
    (snapshot) => {
      const sesiones = snapshot.docs.map((docSnap) => normalizeSesion(docSnap.id, docSnap.data()));
      onChange(sesiones);
    },
    (error) => {
      onError?.(error);
      onChange(filtrarLocal());
    }
  );
}

function normalizeSesion(id: string, data: Record<string, unknown>): SesionEntry {
  return {
    id,
    fecha: String(data.fecha ?? ''),
    origen: data.origen === 'personalizada' ? 'personalizada' : 'plan',
    planId: typeof data.planId === 'string' ? data.planId : null,
    ejercicioId: typeof data.ejercicioId === 'string' ? data.ejercicioId : null,
    caballoId: typeof data.caballoId === 'string' ? data.caballoId : null,
    titulo: String(data.titulo ?? ''),
    completada: Boolean(data.completada),
    calificacion: normalizeRating(data.calificacion),
    nota: typeof data.nota === 'string' && data.nota.trim() ? data.nota : null,
    xp: typeof data.xp === 'number' ? data.xp : 0,
    createdAt: null,
    updatedAt: null,
  };
}

function normalizeRating(value: unknown): SesionRating | null {
  const rating = Math.round(Number(value));
  return rating >= 1 && rating <= 5 ? (rating as SesionRating) : null;
}

// --- Escritura -------------------------------------------------------------

export async function guardarSesion(uid: string, entry: SesionEntry): Promise<void> {
  if (!db || !USE_FIRESTORE) {
    upsertLocal(uid, entry);
    return;
  }

  await setDoc(
    doc(db, 'users', uid, 'sesiones', entry.id),
    {
      fecha: entry.fecha,
      origen: entry.origen,
      planId: entry.planId,
      ejercicioId: entry.ejercicioId,
      caballoId: entry.caballoId,
      titulo: entry.titulo,
      completada: entry.completada,
      calificacion: entry.calificacion,
      nota: entry.nota,
      xp: entry.xp,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Espejo local para que "Hoy" no quede en blanco si se abre sin conexión.
  upsertLocal(uid, entry);
}

/** Marca (o desmarca) una sesión como completada y ajusta su XP. */
export function conCompletadaAlternada(sesion: SesionEntry): SesionEntry {
  const completada = !sesion.completada;
  return {
    ...sesion,
    completada,
    xp: completada ? XP_POR_SESION : 0,
    updatedAt: new Date().toISOString(),
  };
}

export function nuevaSesionPersonalizada(args: {
  fecha: string;
  titulo: string;
  caballoId: string | null;
  calificacion: SesionRating | null;
  nota: string | null;
  completada: boolean;
}): SesionEntry {
  const now = new Date().toISOString();

  return {
    id: createId(),
    fecha: args.fecha,
    origen: 'personalizada',
    planId: null,
    ejercicioId: null,
    caballoId: args.caballoId,
    titulo: args.titulo.trim(),
    completada: args.completada,
    calificacion: args.calificacion,
    nota: args.nota?.trim() || null,
    xp: args.completada ? XP_POR_SESION : 0,
    createdAt: now,
    updatedAt: now,
  };
}

// --- Sesiones que vienen del plan asignado --------------------------------

/**
 * Calcula, para una fecha dada, qué semana del plan corresponde. En vez de
 * un `currentWeek` guardado a mano (como en el modelo viejo), la semana
 * avanza sola: cada tantas sesiones del plan completadas como días de
 * entreno tiene la semana equivalen a una semana, igual que los 5 días
 * hábiles que ya usaba la app (o menos, si el plan personalizado eligió
 * menos días). Es una simplificación deliberada para este borrador -- se
 * puede afinar cuando haya fecha de inicio real por alumno.
 */
export function semanaActualDelPlan(
  sesionesDelPlan: SesionEntry[],
  diasPorSemana: number = DIAS_ENTRENO_POR_DEFECTO.length
): number {
  const completadas = sesionesDelPlan.filter(
    (sesion) => sesion.origen === 'plan' && sesion.completada
  ).length;
  return Math.floor(completadas / Math.max(1, diasPorSemana)) + 1;
}

/**
 * Genera las sesiones "de hoy" a partir del plan asignado. `diasEntrenoSemana`
 * son los días iso (1=lunes...7=domingo) en que el plan tiene sesión --
 * por defecto lunes a viernes, o los días que haya elegido el alumno al
 * armar un plan personalizado con menos frecuencia semanal. El resto de
 * los días son descanso (el alumno igual puede agregar una sesión
 * personalizada esos días). Si ya existe una `SesionEntry` guardada para
 * ese ejercicio y fecha, se usa esa (para reflejar `completada`/
 * `calificacion`); si no, se genera una pendiente con un id
 * determinístico, así el primer guardado cae siempre en el mismo
 * documento.
 */
export function sesionesDeHoyDesdePlan(
  plan: TrainingPlan,
  fecha: string,
  sesionesGuardadas: SesionEntry[],
  diasEntrenoSemana: readonly number[] = DIAS_ENTRENO_POR_DEFECTO
): SesionEntry[] {
  const diaDelPlan = posicionDiaDeEntreno(fecha, diasEntrenoSemana);
  if (diaDelPlan === null) return [];

  const sesionesDelPlan = sesionesGuardadas.filter(
    (sesion) => sesion.origen === 'plan' && sesion.planId === plan.id
  );
  const semana = semanaActualDelPlan(sesionesDelPlan, diasEntrenoSemana.length);
  const ejercicios = getPlanDayExercises(plan, semana, diaDelPlan);

  return ejercicios.map((ejercicio) => {
    const id = `plan-${plan.id}-${fecha}-${ejercicio.id}`;
    const existente = sesionesGuardadas.find((sesion) => sesion.id === id);

    if (existente) return existente;

    return {
      id,
      fecha,
      origen: 'plan',
      planId: plan.id,
      ejercicioId: ejercicio.id,
      caballoId: null,
      titulo: ejercicio.name,
      completada: false,
      calificacion: null,
      nota: null,
      xp: 0,
      createdAt: null,
      updatedAt: null,
    } satisfies SesionEntry;
  });
}

// --- Racha y totales -------------------------------------------------------

export type ResumenProgreso = {
  rachaActual: number;
  xpTotal: number;
  sesionesCompletadas: number;
};

/** Racha = días consecutivos (terminando hoy o ayer) con al menos una sesión completada. */
export function calcularResumenProgreso(sesiones: SesionEntry[], fechaReferencia: string): ResumenProgreso {
  const completadasPorFecha = new Set(
    sesiones.filter((sesion) => sesion.completada).map((sesion) => sesion.fecha)
  );

  let racha = 0;
  let cursor = completadasPorFecha.has(fechaReferencia) ? fechaReferencia : sumarDias(fechaReferencia, -1);

  while (completadasPorFecha.has(cursor)) {
    racha += 1;
    cursor = sumarDias(cursor, -1);
  }

  const xpTotal = sesiones.reduce((total, sesion) => total + (sesion.completada ? sesion.xp : 0), 0);
  const sesionesCompletadas = sesiones.filter((sesion) => sesion.completada).length;

  return { rachaActual: racha, xpTotal, sesionesCompletadas };
}
