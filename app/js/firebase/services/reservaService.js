// js/firebase/services/reservaService.js
import { db } from '../config.js';
import { 
  collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy 
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';


export class ReservaService {
  static async listar() {
    try {
      console.log("📥 Cargando reservas para dashboard...");
      if (!db) {
        throw new Error("Firestore no está inicializado");
      }
      
      const q = query(collection(db, "reservas"), orderBy("fechaCreacion", "desc"));
      const querySnapshot = await getDocs(q);
      const reservas = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Transformación mejorada para el dashboard
        const reservaTransformada = {
          id: doc.id,
          // Campos principales para dashboard
          clienteNombre: data.huespedNombre || '',
          clienteEmail: data.huespedEmail || '',
          habitacionId: data.unidadId || '',
          fechaCheckin: data.checkin || '',
          fechaCheckout: data.checkout || '',
          estado: data.estado || 'pendiente',
          total: data.total || 0,
          
          // Campos específicos de tu estructura para el dashboard
          codigoReserva: data.codigoReserva,
          habitacionNombre: data.habitacionNombre,
          habitacionPrecio: data.habitacionPrecio,
          huespedId: data.huespedId,
          huespedNombre: data.huespedNombre,
          huespedEmail: data.huespedEmail,
          metodoPago: data.metodoPago || {},
          servicios: data.servicios || [],
          tipoHabitacionId: data.tipoHabitacionId,
          unidadId: data.unidadId,
          unidadNumero: data.unidadNumero,
          noches: data.noches || 1,
          fechaCreacion: data.fechaCreacion ? data.fechaCreacion.toDate() : new Date()
        };
        
        reservas.push(reservaTransformada);
      });
      
      console.log("✅ Reservas cargadas para dashboard:", reservas.length);
      return reservas;
    } catch (error) {
      console.error("❌ Error en ReservaService.listar:", error);
      throw error;
    }
  }

static async obtenerPorId(id) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const docRef = doc(db, "reservas", id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Aplicar la misma transformación
        return { 
          id: docSnap.id,
          clienteNombre: data.huespedNombre || '',
          clienteEmail: data.huespedEmail || '',
          clienteTelefono: data.huespedTelefono || 'No especificado',
          clienteDocumento: data.huespedDocumento || 'No especificado',
          habitacionId: data.unidadId || '',
          fechaCheckin: data.checkin || '',
          fechaCheckout: data.checkout || '',
          numeroHuespedes: data.numeroHuespedes || 1,
          estado: data.estado || 'pendiente',
          notas: data.notas || '',
          total: data.total || 0,
          ...data
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error obteniendo reserva por ID:", error);
      throw error;
    }
  }

  static async listarPorEstado(estado) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const q = query(
        collection(db, "reservas"), 
        where("estado", "==", estado),
        orderBy("fechaCheckin", "asc")
      );
      const querySnapshot = await getDocs(q);
      const reservas = [];
      querySnapshot.forEach((doc) => {
        reservas.push({ id: doc.id, ...doc.data() });
      });
      return reservas;
    } catch (error) {
      console.error("Error listando reservas por estado:", error);
      throw error;
    }
  }

  static async listarPorHabitacion(habitacionId) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      const q = query(
        collection(db, "reservas"), 
        where("habitacionId", "==", habitacionId),
        orderBy("fechaCheckin", "asc")
      );
      const querySnapshot = await getDocs(q);
      const reservas = [];
      querySnapshot.forEach((doc) => {
        reservas.push({ id: doc.id, ...doc.data() });
      });
      return reservas;
    } catch (error) {
      console.error("Error listando reservas por habitación:", error);
      throw error;
    }
  }

 static async crear(data) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      // Transformar los datos al guardar (si es necesario)
      const datosFirebase = {
        huespedNombre: data.clienteNombre,
        huespedEmail: data.clienteEmail,
        huespedTelefono: data.clienteTelefono,
        huespedDocumento: data.clienteDocumento,
        checkin: data.fechaCheckin,
        checkout: data.fechaCheckout,
        numeroHuespedes: data.numeroHuespedes,
        estado: data.estado,
        notas: data.notas,
        total: data.total,
        // ... otros campos que necesites mapear
      };
      
      const docRef = await addDoc(collection(db, "reservas"), {
        ...datosFirebase,
        fechaCreacion: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creando reserva:", error);
      throw error;
    }
  }

static async actualizar(id, data) {
  try {
    if (!db) throw new Error("Firestore no está inicializado");
    
    const docRef = doc(db, "reservas", id);
    
    // Preparar datos para Firebase - mapeo correcto
    const datosFirebase = {
      estado: data.estado,
      // Si necesitas actualizar otros campos, agrégalos aquí
      // pero mantén la estructura original de Firebase
      updatedAt: new Date()
    };
    
    console.log("📤 Actualizando reserva:", id, "con datos:", datosFirebase);
    await updateDoc(docRef, datosFirebase);
    console.log("✅ Reserva actualizada correctamente");
    
  } catch (error) {
    console.error("❌ Error actualizando reserva:", error);
    throw error;
  }
}

  static async eliminar(id) {
    try {
      if (!db) throw new Error("Firestore no está inicializado");
      
      await deleteDoc(doc(db, "reservas", id));
    } catch (error) {
      console.error("Error eliminando reserva:", error);
      throw error;
    }
  }
}