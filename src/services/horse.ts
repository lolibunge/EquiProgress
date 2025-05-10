import { auth, db } from '@/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { Horse } from '@/types/firestore'; // Add this line


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

  const newHorseData: Omit<Horse, 'id' | 'photoUrl' | 'notes' | 'createdAt'> & { createdAt: Timestamp } = {
    name: horseData.name,
    age: horseData.age,
    sex: horseData.sex,
    color: horseData.color,
    ownerUid: user.uid,
    createdAt: serverTimestamp() as Timestamp, // Firestore will convert this
  };

  try {
    const docRef = await addDoc(collection(db, 'horses'), newHorseData);
    console.log('Document written with ID: ', docRef.id);
    return docRef.id; // Return the new document's ID
  } catch (e) {
    console.error('Error adding document: ', e);
    throw e; // Re-throw the error for handling in the UI
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
    throw e; // Re-throw the error for handling in the UI
  }
};
