// js/firebase/services/servicioService.js
import { db } from '../config.js';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

export class ServicioService {
  static async listar() {
    try {
      console.log("📥 Cargando servicios...");
      if (!db) {
        throw new Error("Firestore no está inicializado");
      }
      
      const querySnapshot = await getDocs(collection(db, "servicios"));
      const servicios = [];
      querySnapshot.forEach((doc) => {
        servicios.push({ id: doc.id, ...doc.data() });
      });
      console.log("✅ Servicios cargados:", servicios.length);
      return servicios;
    } catch (error) {
      console.error("❌ Error en ServicioService.listar:", error);
      throw error;
    }
  }

  static async obtenerPorId(id) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const docRef = doc(db, "servicios", id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error obteniendo servicio por ID:", error);
      throw error;
    }
  }

  static async crear(data) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const docRef = await addDoc(collection(db, "servicios"), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creando servicio:", error);
      throw error;
    }
  }

  static async actualizar(id, data) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const docRef = doc(db, "servicios", id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error actualizando servicio:", error);
      throw error;
    }
  }

  static async eliminar(id) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      await deleteDoc(doc(db, "servicios", id));
    } catch (error) {
      console.error("Error eliminando servicio:", error);
      throw error;
    }
  }
}