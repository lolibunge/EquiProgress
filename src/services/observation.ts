import { auth, db } from '@/firebase';
import type { Observation, ObservationInput } from '@/types/firestore';
import { collection, addDoc, getDocs, serverTimestamp, Timestamp, query, where, orderBy, doc } from 'firebase/firestore';

/**
 * Adds a new observation for a horse.
 * @param horseId The ID of the horse.
 * @param observationData The data for the new observation.
 * @returns The ID of the newly created observation.
 */
export async function addObservation(horseId: string, observationData: ObservationInput): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario no autenticado. Por favor, inicie sesión.");
  }
  if (!horseId) {
    throw new Error("El ID del caballo es requerido para añadir una observación.");
  }

  const observationsCollectionRef = collection(db, 'horses', horseId, 'observations');
  
  const newObservationDoc: Omit<Observation, 'id' | 'createdAt' | 'updatedAt' | 'horseId' | 'userId'> & { createdAt: Timestamp, updatedAt: Timestamp, userId: string, horseId: string } = {
    ...observationData,
    userId: user.uid,
    horseId: horseId, // Storing horseId for potential collection group queries
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  try {
    const docRef = await addDoc(observationsCollectionRef, newObservationDoc);
    console.log('Observación creada con ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error al crear observación: ', e);
    throw e;
  }
}

/**
 * Fetches all observations for a specific horse, ordered by date.
 * @param horseId The ID of the horse.
 * @returns An array of observation data.
 */
export async function getObservationsByHorseId(horseId: string): Promise<Observation[]> {
  if (!horseId) {
    console.warn("El ID del caballo es requerido para obtener observaciones.");
    return [];
  }
  try {
    const observationsRef = collection(db, 'horses', horseId, 'observations');
    const q = query(observationsRef, orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const observations: Observation[] = [];
    querySnapshot.forEach((doc) => {
      observations.push({ id: doc.id, ...doc.data() } as Observation);
    });
    return observations;
  } catch (e) {
    console.error('Error al obtener observaciones del caballo: ', e);
    throw e;
  }
}