import { db } from '../config.js';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';

const COL = 'servicios';

export const ServicioService = {
  async listar() {
    const q = query(collection(db, COL), orderBy('nombre', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async listarPorCategoria(categoriaId) {
    const q = query(
      collection(db, COL), 
      where('categoriaId', '==', categoriaId),
      orderBy('nombre', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async listarDestacados() {
    const q = query(
      collection(db, COL), 
      where('destacado', '==', true),
      where('estado', '==', 'activo')
    );
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