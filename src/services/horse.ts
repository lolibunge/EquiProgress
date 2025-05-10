
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
  const user = auth.currentUser;
  if (!user) {
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
    console.log('Document written with ID: ', docRef.id);
    return docRef.id; 
  } catch (e) {
    console.error('Error adding document: ', e);
    throw e; 
  }
};

export const getHorses = async (ownerUid: string): Promise<Horse[]> => {
  if (!ownerUid) {
    console.warn("ownerUid is required to fetch horses.");
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
    return horses;
  } catch (e) {
    console.error('Error fetching documents: ', e);
    throw e; 
  }
};

export const getHorseById = async (horseId: string): Promise<Horse | null> => {
  if (!horseId) {
    console.warn("horseId is required to fetch a horse.");
    return null;
  }
  try {
    const horseDocRef = doc(db, 'horses', horseId);
    const horseDocSnap = await getDoc(horseDocRef);
    if (horseDocSnap.exists()) {
      return { id: horseDocSnap.id, ...horseDocSnap.data() } as Horse;
    } else {
      console.log("No such horse document!");
      return null;
    }
  } catch (e) {
    console.error('Error fetching horse document: ', e);
    throw e;
  }
};
