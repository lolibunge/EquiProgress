import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

interface SessionData {
  date: string;
  time: string;
  horse: string;
  duration: number;
  notes: string;
}

export const createSession = async (sessionData: SessionData) => {
  try {
    const docRef = await addDoc(collection(db, "sessions"), sessionData);
    console.log("Document written with ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    return null;
  }
 };
