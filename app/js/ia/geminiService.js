// js/ia/geminiService.js
import { db, doc, getDoc } from "../firebase/config.js";

const GEMINI_API_KEY = "AIzaSyDrR2acWEGMCXrgE8KTCUicFRTrsCpR32M";
const MODEL = "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

class GeminiService {

    async getUserProfile(uid) {
        if (!uid) return null;

        const ref = doc(db, "huespedes", uid);
        const snap = await getDoc(ref);

        return snap.exists() ? snap.data() : null;
    }

    // ✅ Construcción del prompt
    buildPrompt(userProfile, room, services) {
        return `
Genera 3 RECOMENDACIONES en JSON para un huésped de hotel.

PERFIL:  
${JSON.stringify(userProfile, null, 2)}

HABITACIÓN SELECCIONADA:
${JSON.stringify(room || {}, null, 2)}

SERVICIOS SELECCIONADOS:
${JSON.stringify(services || [], null, 2)}

FORMATO ESTRICTO JSON:
[
  {
    "id": "rec1",
    "titulo": "Texto",
    "descripcion": "Texto",
    "tipo": "servicio | experiencia | upgrade",
    "prioridad": 0.75,
    "accionRecomendada": "Agregar al carrito",
    "beneficio": "Texto",
    "precioAproximado": "S/ 50 - 120"
  }
]
`;
    }

    async askGemini(prompt) {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const match = text.match(/\[[\s\S]*\]/);

        if (!match) throw new Error("No se encontró JSON válido.");

        return JSON.parse(match[0]);
    }

    async generateRecommendations(userProfile, selectedRoom, selectedServices) {
        const prompt = this.buildPrompt(userProfile, selectedRoom, selectedServices);
        return await this.askGemini(prompt);
    }
}

export const geminiService = new GeminiService();
