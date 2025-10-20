// js/firebase/services/huespedService.js
import { db } from '../config.js';
import { doc, setDoc } from 'firebase/firestore';

export const HuespedService = {
  async guardarPerfil(uid, datos) {
    await setDoc(doc(db, 'huespedes', uid), {
      uid,
      ...datos,
      createdAt: new Date()
    });
  }
};