// js/firebase/services/huespedService.js - VERSIÓN CORREGIDA
import { db } from '../config.js';
import { doc, setDoc, updateDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

export class HuespedService {
  static async guardarPerfil(uid, datos) {
    try {
      console.log("📝 Guardando perfil para UID:", uid);
      console.log("📊 Datos a guardar:", datos);
      
      // VERIFICAR que db esté definido
      if (!db) {
        throw new Error("Firestore no está inicializado");
      }
      
      await setDoc(doc(db, "huespedes", uid), datos);
      console.log("✅ Perfil de huésped guardado exitosamente");
      return true;
    } catch (error) {
      console.error("❌ Error guardando perfil:", error);
      throw error;
    }
  }

  static async obtenerPerfil(uid) {
    try {
      if (!db) {
        throw new Error("Firestore no está inicializado");
      }
      
      const docRef = doc(db, "huespedes", uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log("✅ Perfil encontrado:", docSnap.data());
        return docSnap.data();
      } else {
        console.log("❌ No se encontró el perfil del huésped");
        return null;
      }
    } catch (error) {
      console.error("Error obteniendo perfil:", error);
      throw error;
    }
  }

  static async actualizarPreferencias(uid, nuevasPreferencias) {
    try {
      if (!db) {
        throw new Error("Firestore no está inicializado");
      }
      
      await updateDoc(doc(db, "huespedes", uid), {
        preferencias: nuevasPreferencias,
        updatedAt: new Date()
      });
      console.log("✅ Preferencias actualizadas para:", uid);
      return true;
    } catch (error) {
      console.error("Error actualizando preferencias:", error);
      throw error;
    }
  }

  static async actualizarHistorial(uid, nuevaReserva) {
    try {
      const perfil = await this.obtenerPerfil(uid);
      if (!perfil) {
        throw new Error("Perfil no encontrado");
      }

      const historialActualizado = {
        ...perfil.historial,
        reservas: (perfil.historial?.reservas || 0) + 1,
        ultimaVisita: new Date(),
        reservasRealizadas: [...(perfil.historial?.reservasRealizadas || []), nuevaReserva]
      };

      await updateDoc(doc(db, "huespedes", uid), {
        historial: historialActualizado,
        updatedAt: new Date()
      });
      
      console.log("✅ Historial actualizado");
      return true;
    } catch (error) {
      console.error("Error actualizando historial:", error);
      throw error;
    }
  }
}