
import { auth, db } from '@/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import type { Horse } from '@/types/firestore';


// Interface for the data collected from the form
export interface HorseInputData {
  name: string;
  age: number;
  sex: "Macho" | "Hembra" | "Castrado";
  color: string;
}

export const addHorse = async (horseData: HorseInputData): Promise<string> => {
  console.log("[HorseService] addHorse called with data:", horseData);
  const user = auth.currentUser;
  if (!user) {
    console.error("[HorseService] addHorse: User not authenticated.");
    throw new Error("Usuario no autenticado. Por favor, inicie sesión.");
  }

  const newHorseData: Omit<Horse, 'id' | 'photoUrl' | 'notes'> & { ownerUid: string; createdAt: Timestamp; updatedAt?: Timestamp } = {
    name: horseData.name,
    age: horseData.age,
    sex: horseData.sex,
    color: horseData.color,
    ownerUid: user.uid,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  try {
    const docRef = await addDoc(collection(db, 'horses'), newHorseData);
    console.log('[HorseService] addHorse: Document written with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('[HorseService] addHorse: Error adding document: ', e);
    throw e;
  }
};

export const getHorses = async (ownerUid: string): Promise<Horse[]> => {
  console.log(`[HorseService] getHorses called for ownerUid: ${ownerUid}`);
  if (!ownerUid) {
    console.warn("[HorseService] getHorses: ownerUid is required. Returning empty array.");
    return [];
  }
  try {
    const q = query(
      collection(db, 'horses'),
      where("ownerUid", "==", ownerUid),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const horses: Horse[] = [];
    querySnapshot.forEach((doc) => {
      horses.push({ id: doc.id, ...doc.data() } as Horse);
    });
    console.log(`[HorseService] getHorses: Fetched ${horses.length} horses for ownerUid ${ownerUid}.`);
    return horses;
  } catch (e: any) {
    console.error(`[HorseService] getHorses: Error fetching documents for ownerUid ${ownerUid}:`, e);
    if (e.code === 'failed-precondition' && e.message.includes('index')) {
      console.error(`[HorseService] INDEX_REQUIRED: Firestore query for getHorses (ownerUid: ${ownerUid}, orderBy: createdAt desc) likely needs a composite index. Please check the Firebase console for a link to create it.`);
    }
    throw e;
  }
};

export const getHorseById = async (horseId: string): Promise<Horse | null> => {
  console.log(`[HorseService] getHorseById called for horseId: ${horseId}`);
  if (!horseId) {
    console.warn("[HorseService] getHorseById: horseId is required. Returning null.");
    return null;
  }
  try {
    const horseDocRef = doc(db, 'horses', horseId);
    const horseDocSnap = await getDoc(horseDocRef);
    if (horseDocSnap.exists()) {
      const horseData = { id: horseDocSnap.id, ...horseDocSnap.data() } as Horse;
      console.log(`[HorseService] getHorseById: Found horse for ID ${horseId}:`, horseData);
      return horseData;
    } else {
      console.log(`[HorseService] getHorseById: No such horse document for ID: ${horseId}`);
      return null;
    }
  } catch (e) {
    console.error(`[HorseService] getHorseById: Error fetching horse document for ID ${horseId}:`, e);
    throw e;
  }
};
