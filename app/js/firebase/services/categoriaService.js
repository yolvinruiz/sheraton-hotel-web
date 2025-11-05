// js/firebase/services/categoriaService.js
import { db } from '../config.js';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

export class CategoriaService {
  static async listar() {
    try {
      console.log("📥 Cargando categorías...");
      if (!db) {
        throw new Error("Firestore no está inicializado");
      }
      
      const querySnapshot = await getDocs(collection(db, "categorias"));
      const categorias = [];
      querySnapshot.forEach((doc) => {
        categorias.push({ id: doc.id, ...doc.data() });
      });
      console.log("✅ Categorías cargadas:", categorias.length);
      return categorias;
    } catch (error) {
      console.error("❌ Error en CategoriaService.listar:", error);
      throw error;
    }
  }

  static async obtenerPorId(id) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const docRef = doc(db, "categorias", id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error obteniendo categoría por ID:", error);
      throw error;
    }
  }

  static async crear(data) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const docRef = await addDoc(collection(db, "categorias"), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creando categoría:", error);
      throw error;
    }
  }

  static async actualizar(id, data) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const docRef = doc(db, "categorias", id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error actualizando categoría:", error);
      throw error;
    }
  }

  static async eliminar(id) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      await deleteDoc(doc(db, "categorias", id));
    } catch (error) {
      console.error("Error eliminando categoría:", error);
      throw error;
    }
  }
}