import { db } from '../config.js';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const COL = 'tiposHabitacion';

export const TipoHabitacionService = {
  async listar() {
    try {
      const snap = await getDocs(collection(db, COL));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error en TipoHabitacionService.listar:", error);
      throw error;
    }
  },
  async crear(data) {
    return await addDoc(collection(db, COL), data);
  },
  async actualizar(id, data) {
    await updateDoc(doc(db, COL, id), data);
  },
  async eliminar(id) {
    await deleteDoc(doc(db, COL, id));
  }
};