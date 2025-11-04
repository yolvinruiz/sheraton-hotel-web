import { db } from '../config.js';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

const COL = 'categoriasServicios';

export const CategoriaService = {
  async listar() {
    const q = query(collection(db, COL), orderBy('orden', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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