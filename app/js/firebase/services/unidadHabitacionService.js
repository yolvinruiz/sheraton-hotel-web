// js/firebase/services/unidadHabitacionService.js
import { db } from '../config.js';
import { collection, getDocs, query, where, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

export class UnidadHabitacionService {
  static async listarPorTipo(tipoId) {
    try {
      console.log("📥 Cargando unidades para tipo:", tipoId);
      if (!db) {
        throw new Error("Firestore no está inicializado");
      }
      
      const q = query(collection(db, "unidadesHabitacion"), where("tipoId", "==", tipoId));
      const querySnapshot = await getDocs(q);
      const unidades = [];
      querySnapshot.forEach((doc) => {
        unidades.push({ id: doc.id, ...doc.data() });
      });
      console.log("✅ Unidades cargadas:", unidades.length);
      return unidades;
    } catch (error) {
      console.error("❌ Error en UnidadHabitacionService.listarPorTipo:", error);
      throw error;
    }
  }

  static async listarTodas() {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const querySnapshot = await getDocs(collection(db, "unidadesHabitacion"));
      const unidades = [];
      querySnapshot.forEach((doc) => {
        unidades.push({ id: doc.id, ...doc.data() });
      });
      return unidades;
    } catch (error) {
      console.error("Error listando todas las unidades:", error);
      throw error;
    }
  }

  static async obtenerPorId(id) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const docRef = doc(db, "unidadesHabitacion", id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error obteniendo unidad por ID:", error);
      throw error;
    }
  }

  static async crear(data) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const docRef = await addDoc(collection(db, "unidadesHabitacion"), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creando unidad:", error);
      throw error;
    }
  }

  static async actualizar(id, data) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const docRef = doc(db, "unidadesHabitacion", id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error actualizando unidad:", error);
      throw error;
    }
  }

  static async eliminar(id) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      await deleteDoc(doc(db, "unidadesHabitacion", id));
    } catch (error) {
      console.error("Error eliminando unidad:", error);
      throw error;
    }
  }
}