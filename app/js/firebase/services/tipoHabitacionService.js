// js/firebase/services/tipoHabitacionService.js
import { db } from '../config.js';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

export class TipoHabitacionService {
  static async listar() {
    try {
      console.log("📥 Cargando tipos de habitación...");
      if (!db) {
        throw new Error("Firestore no está inicializado");
      }
      
      const querySnapshot = await getDocs(collection(db, "tiposHabitacion"));
      const tipos = [];
      querySnapshot.forEach((doc) => {
        tipos.push({ id: doc.id, ...doc.data() });
      });
      console.log("✅ Tipos de habitación cargados:", tipos.length);
      return tipos;
    } catch (error) {
      console.error("❌ Error en TipoHabitacionService.listar:", error);
      throw error;
    }
  }

  static async obtenerPorId(id) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const docRef = doc(db, "tiposHabitacion", id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error obteniendo tipo por ID:", error);
      throw error;
    }
  }

  static async crear(data) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const docRef = await addDoc(collection(db, "tiposHabitacion"), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creando tipo:", error);
      throw error;
    }
  }

  static async actualizar(id, data) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const docRef = doc(db, "tiposHabitacion", id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error actualizando tipo:", error);
      throw error;
    }
  }

  static async eliminar(id) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      await deleteDoc(doc(db, "tiposHabitacion", id));
    } catch (error) {
      console.error("Error eliminando tipo:", error);
      throw error;
    }
  }
}