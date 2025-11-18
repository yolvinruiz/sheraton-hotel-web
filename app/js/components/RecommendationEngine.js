// js/components/RecommendationEngine.js
import {
  collection,
  doc,
  getDoc,
  getDocs
} from "../firebase/config.js";

import { db } from "../firebase/config.js";
import { geminiService } from "../ia/geminiService.js";

// Clase RecommendationEngine mejorada: usa solo IDs reales y enlaza con homeHuesped
export default class RecommendationEngine {

  /** Obtiene perfil de huésped (si hace falta) */
  static async getGuestProfile(huespedId) {
    if (!huespedId) return null;
    const snap = await getDoc(doc(db, "huespedes", huespedId));
    return snap.exists() ? snap.data() : null;
  }

  /** Trae todos los servicios reales de Firestore */
  static async getAllServicios() {
    const snap = await getDocs(collection(db, "servicios"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  /** Trae todos los tipos de habitación reales de Firestore */
  static async getAllRoomTypes() {
    const snap = await getDocs(collection(db, "tiposHabitacion"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  /** Construye prompt incluyendo lista segura de IDs/nombres para que la IA no invente IDs */
  static async buildPrompt(huespedId, room, services) {
    const perfil = await this.getGuestProfile(huespedId);
    const servicios = await this.getAllServicios();
    const roomTypes = await this.getAllRoomTypes();

    // Preparar listados compactos (solo campos relevantes)
    const serviciosList = servicios.map(s => ({
      id: s.id,
      nombre: s.nombre,
      precio: s.precio,
      categoriaId: s.categoriaId,
      descripcion: s.descripcion || ""
    }));

    const roomsList = roomTypes.map(r => ({
      id: r.id,
      nombre: r.nombre,
      precioPorNoche: r.precioPorNoche,
      tipo: r.tipo,
      descripcion: r.descripcion || ""
    }));

    return `
Eres un recomendador inteligente de un hotel. **SOLO** puedes recomendar items que aparecen en las listas "SERVICIOS_REALES" o "ROOM_TYPES_REALES". 
Si deseas recomendar un servicio, devuelve su ID EXACTO como "id" que exista en SERVICIOS_REALES. 
Si deseas recomendar una habitación, devuelve su id EXACTO como "id" que exista en ROOM_TYPES_REALES.

HUÉSPED:
${JSON.stringify(perfil, null, 2)}

HABITACIÓN SELECCIONADA ACTUAL:
${JSON.stringify(room || {}, null, 2)}

SERVICIOS SELECCIONADOS ACTUALES:
${JSON.stringify(services || [], null, 2)}

SERVICIOS_REALES:
${JSON.stringify(serviciosList, null, 2)}

ROOM_TYPES_REALES:
${JSON.stringify(roomsList, null, 2)}

INSTRUCCIONES DE SALIDA (FORMATO ESTRICTO JSON):
Devuelve un array JSON EXACTO con hasta 6 recomendaciones. Cada item debe tener:
[
  {
    "id": "<ID del servicio o id del tipo de habitación - obligatorio (debe existir en las listas)>",
    "titulo": "Título corto",
    "descripcion": "Explicación breve",
    "tipo": "servicio | experiencia | upgrade | habitacion",
    "prioridad": 0.0,
    "accionRecomendada": "Agregar al carrito | Seleccionar habitación | Ver detalle",
    "beneficio": "Texto corto",
    "precioAproximado": "S/ 0 - 0"
  }
]

IMPORTANTE:
- Si recomiendas un servicio usa "tipo": "servicio".
- Si recomiendas una habitación usa "tipo": "habitacion".
- NO inventes IDs. Si no puedes proponer un ID válido, devuelve un array vacío [].
    `.trim();
  }

  /** Inicializa y renderiza (llamada desde el HTML con contexto) */
  async initialize(container, context) {
    this.container = container;
    this.renderLoading();

    try {
      // Obtener listas reales para validación posterior
      const [serviciosReales, roomsReales] = await Promise.all([
        RecommendationEngine.getAllServicios(),
        RecommendationEngine.getAllRoomTypes()
      ]);

      // Mapa rápido por id y por nombre (lowercase) para fallback
      const serviciosMap = new Map(serviciosReales.map(s => [s.id, s]));
      const serviciosByName = serviciosReales.reduce((acc, s) => {
        acc[s.nombre.toLowerCase()] = s;
        return acc;
      }, {});
      const roomsMap = new Map(roomsReales.map(r => [r.id, r]));
      const roomsByName = roomsReales.reduce((acc, r) => {
        acc[r.nombre.toLowerCase()] = r;
        return acc;
      }, {});

      const prompt = await RecommendationEngine.buildPrompt(
        context.userId,
        context.selectedRoom,
        context.selectedServices
      );

      // Preguntar a Gemini (usa geminiService.askGemini para obtener array JSON)
      const rawRecommendations = await geminiService.askGemini(prompt);

      // Validar y mapear -> mantener solo recomendaciones seguras
      const validated = rawRecommendations
        .map(rec => {
          const recId = rec.id?.toString?.().trim();
          const recTipo = (rec.tipo || '').toLowerCase();

          // 1) Si ID existe en servicios -> devolver con datos reales
          if (serviciosMap.has(recId)) {
            const s = serviciosMap.get(recId);
            return {
              id: s.id,
              titulo: rec.titulo || s.nombre,
              descripcion: rec.descripcion || rec.descripcion || s.descripcion || '',
              tipo: 'servicio',
              prioridad: rec.prioridad || 0.5,
              accionRecomendada: rec.accionRecomendada || 'Agregar al carrito',
              beneficio: rec.beneficio || '',
              precioAproximado: `S/ ${s.precio}`
            };
          }

          // 2) Si ID existe en rooms -> mapear a habitación
          if (roomsMap.has(recId)) {
            const r = roomsMap.get(recId);
            return {
              id: r.id,
              titulo: rec.titulo || r.nombre,
              descripcion: rec.descripcion || r.descripcion || '',
              tipo: 'habitacion',
              prioridad: rec.prioridad || 0.5,
              accionRecomendada: rec.accionRecomendada || 'Seleccionar habitación',
              beneficio: rec.beneficio || '',
              precioAproximado: `S/ ${r.precioPorNoche} / noche`
            };
          }

          // 3) Fallback por nombre: buscar coincidencias en servicios
          const titleLower = (rec.titulo || '').toLowerCase();
          if (titleLower && serviciosByName[titleLower]) {
            const s = serviciosByName[titleLower];
            return {
              id: s.id,
              titulo: rec.titulo || s.nombre,
              descripcion: rec.descripcion || s.descripcion || '',
              tipo: 'servicio',
              prioridad: rec.prioridad || 0.5,
              accionRecomendada: rec.accionRecomendada || 'Agregar al carrito',
              beneficio: rec.beneficio || '',
              precioAproximado: `S/ ${s.precio}`
            };
          }
          // 4) Fallback por nombre en habitaciones
          if (titleLower && roomsByName[titleLower]) {
            const r = roomsByName[titleLower];
            return {
              id: r.id,
              titulo: rec.titulo || r.nombre,
              descripcion: rec.descripcion || r.descripcion || '',
              tipo: 'habitacion',
              prioridad: rec.prioridad || 0.5,
              accionRecomendada: rec.accionRecomendada || 'Seleccionar habitación',
              beneficio: rec.beneficio || '',
              precioAproximado: `S/ ${r.precioPorNoche} / noche`
            };
          }

          // 5) Si no hay forma de validar, descartar (return null)
          return null;
        })
        .filter(Boolean); // quitar nulls

      if (!validated || validated.length === 0) {
        this.renderError("No se encontraron recomendaciones válidas (la IA no devolvió IDs válidos).");
        return;
      }

      // Finalmente renderizar recomendaciones validadas
      this.render(validated);

    } catch (err) {
      console.error("Error IA:", err);
      this.renderError("No se pudieron generar recomendaciones");
    }
  }

  renderLoading() {
    this.container.innerHTML = `
      <div style="text-align:center">
        <h3>Generando recomendaciones...</h3>
        <div class="spinner"></div>
      </div>
    `;
  }

  renderError(msg) {
    this.container.innerHTML = `
      <div style="text-align:center; color:red">
        <h3>${msg}</h3>
      </div>
    `;
  }

  /** Renderiza tarjetas con botones que llaman a homeHuesped */
render(list) {
  this.container.innerHTML = `
    <h2>Recomendaciones IA</h2>
    <div class="grid">
      ${list.map(r => `
        <div class="card">
          <span class="type-badge ${r.tipo}">${r.tipo}</span>
          <h3>${this.escapeHtml(r.titulo)}</h3>
          <p>${this.escapeHtml(r.descripcion)}</p>
          <p><strong>Beneficio:</strong> ${this.escapeHtml(r.beneficio || '')}</p>
          <p class="price">${this.escapeHtml(r.precioAproximado || '')}</p>
          <div style="margin-top:10px;">
            ${this.renderActionButton(r)}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

  renderActionButton(r) {
    // Si es servicio -> botón agregar al carrito
    if (r.tipo === 'servicio') {
      return `<button class="btn btn-primary" onclick="recomendacionesController.agregarServicio('${r.id}')">
                <i class="fas fa-plus"></i> Agregar al carrito
              </button>`;
    }

    // Si es habitación -> botón seleccionar (reservar)
    if (r.tipo === 'habitacion') {
      return `<button class="btn btn-primary" onclick="recomendacionesController.seleccionarHabitacion('${r.id}')">
                <i class="fas fa-calendar-check"></i> Seleccionar habitación recomendada
              </button>`;
    }

    // Otros tipos -> botón ver detalles (intentar agregar si es servicio)
    return `<button class="btn btn-outline" onclick="alert('Acción: ${this.escapeHtml(r.accionRecomendada || 'Ver detalle')}')">
              ${this.escapeHtml(r.accionRecomendada || 'Ver detalle')}
            </button>`;
  }

  escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Instancia global (igual que antes)
export const recommendationEngine = new RecommendationEngine();
window.recommendationEngine = recommendationEngine;
