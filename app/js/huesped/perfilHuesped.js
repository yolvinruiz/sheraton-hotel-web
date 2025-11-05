// js/huesped/perfilHuesped.js - VERSIÓN COMPLETA CON EDICIÓN DE PREFERENCIAS
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { app } from '../firebase/config.js';

const auth = getAuth();
const db = getFirestore(app);

class PerfilHuesped {
    constructor() {
        this.userData = null;
        this.userPreferences = null;
        this.isEditing = false;
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.bindEvents();
    }

    async checkAuth() {
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    await this.loadUserData(user.uid);
                    this.renderProfile();
                    resolve();
                } else {
                    window.location.href = '/index.html';
                }
            });
        });
    }

    async loadUserData(uid) {
        try {
            const userDoc = await getDoc(doc(db, "huespedes", uid));
            if (userDoc.exists()) {
                this.userData = userDoc.data();
                this.userPreferences = this.userData.preferencias || {};
                console.log("✅ Datos del perfil cargados:", this.userData);
                console.log("🎯 Preferencias cargadas:", this.userPreferences);
            }
        } catch (error) {
            console.error("Error al cargar datos del usuario:", error);
            this.showError("Error al cargar los datos del perfil");
        }
    }

    renderProfile() {
        if (!this.userData) return;

        // Avatar
        document.getElementById('profile-avatar').textContent = 
            (this.userData.nombre?.charAt(0) || '') + (this.userData.apellidos?.charAt(0) || '');

        // Información personal
        document.getElementById('profile-name').textContent = 
            `${this.userData.nombre || ''} ${this.userData.apellidos || ''}`.trim();
        document.getElementById('profile-dni').textContent = this.userData.dni || 'No especificado';
        document.getElementById('profile-email').textContent = this.userData.email || '';
        document.getElementById('profile-phone').textContent = this.userData.telefono || 'No especificado';
        document.getElementById('profile-age').textContent = this.userData.edad ? `${this.userData.edad} años` : 'No especificado';
        document.getElementById('profile-gender').textContent = this.getGenderText(this.userData.genero);

        // Renderizar preferencias
        this.renderPreferences();
    }

    renderPreferences() {
        if (!this.userPreferences) return;

        const container = document.getElementById('preferences-container');
        if (!container) return;

        let html = `
            <div class="profile-info">
                <h3>Preferencias de Viaje</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Tipo de Viaje</div>
                        <div class="info-value">${this.getTravelTypeText(this.userPreferences.tipoViaje)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Nivel de Comodidad</div>
                        <div class="info-value">${this.getComfortLevelText(this.userPreferences.nivelComodidad)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Habitaciones Preferidas</div>
                        <div class="info-value">${this.renderHabitacionesList()}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Servicios Favoritos</div>
                        <div class="info-value">${this.renderServiciosList()}</div>
                    </div>
                    ${this.userPreferences.solicitudesEspeciales ? `
                    <div class="info-item full-width">
                        <div class="info-label">Solicitudes Especiales</div>
                        <div class="info-value">${this.userPreferences.solicitudesEspeciales}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    renderHabitacionesList() {
        if (!this.userPreferences.habitaciones || this.userPreferences.habitaciones.length === 0) {
            return 'No especificadas';
        }

        const habitacionesMap = {
            'vista-jardín': '🌿 Vista al Jardín',
            'vista-mar': '🌊 Vista al Mar', 
            'vista-ciudad': '🏙️ Vista a la Ciudad',
            'piso-alto': '🏢 Piso Alto',
            'silenciosa': '🔇 Zona Silenciosa',
            'suite-lujo': '👑 Suite de Lujo',
            'accesible': '♿ Accesible'
        };

        return this.userPreferences.habitaciones.map(pref => 
            habitacionesMap[pref] || pref
        ).join(', ');
    }

    renderServiciosList() {
        if (!this.userPreferences.servicios || this.userPreferences.servicios.length === 0) {
            return 'No especificados';
        }

        const serviciosMap = {
            'spa': '💆 Spa & Bienestar',
            'gimnasio': '💪 Gimnasio',
            'restaurante': '🍽️ Restaurante',
            'piscina': '🏊 Piscina',
            'bar': '🍹 Bar',
            'room-service': '🔔 Room Service',
            'business': '💼 Business Center',
            'eventos': '📅 Salón de Eventos'
        };

        return this.userPreferences.servicios.map(pref => 
            serviciosMap[pref] || pref
        ).join(', ');
    }

    getGenderText(gender) {
        const genderMap = {
            'male': 'Masculino',
            'female': 'Femenino', 
            'other': 'Otro',
            'prefer-not': 'Prefiero no decir'
        };
        return genderMap[gender] || 'No especificado';
    }

    getTravelTypeText(travelType) {
        const travelMap = {
            'negocios': 'Negocios',
            'vacaciones': 'Vacaciones',
            'romantico': 'Viaje Romántico',
            'familiar': 'Viaje Familiar',
            'evento': 'Evento Especial'
        };
        return travelMap[travelType] || 'No especificado';
    }

    getComfortLevelText(comfortLevel) {
        const comfortMap = {
            'economico': 'Económico',
            'estandar': 'Estándar',
            'superior': 'Superior',
            'lujo': 'Lujo',
            'premium': 'Premium'
        };
        return comfortMap[comfortLevel] || 'No especificado';
    }

    bindEvents() {
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            if(confirm('¿Está seguro de que desea cerrar sesión?')) {
                signOut(auth).then(() => {
                    window.location.href = '/index.html';
                });
            }
        });

        document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
            this.enterEditMode();
        });

        document.getElementById('save-profile-btn')?.addEventListener('click', () => {
            this.saveProfile();
        });

        document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
            this.exitEditMode();
        });
    }

    enterEditMode() {
        this.isEditing = true;
        
        // Cambiar botones
        document.getElementById('edit-profile-btn').style.display = 'none';
        document.getElementById('save-profile-btn').style.display = 'inline-block';
        document.getElementById('cancel-edit-btn').style.display = 'inline-block';

        // Crear formulario de edición
        this.createEditForm();
    }

    exitEditMode() {
        this.isEditing = false;
        
        // Restaurar botones
        document.getElementById('edit-profile-btn').style.display = 'inline-block';
        document.getElementById('save-profile-btn').style.display = 'none';
        document.getElementById('cancel-edit-btn').style.display = 'none';

        // Restaurar vista normal
        this.renderProfile();
        this.renderPreferences();
    }

    createEditForm() {
        const container = document.getElementById('preferences-container');
        if (!container) return;

        let html = `
            <div class="edit-preferences-form">
                <h3>Editar Preferencias de Viaje</h3>
                
                <div class="form-group">
                    <label for="edit-travel-type">Tipo de Viaje</label>
                    <select id="edit-travel-type" class="form-control">
                        <option value="">Seleccione el propósito de su viaje</option>
                        <option value="negocios" ${this.userPreferences.tipoViaje === 'negocios' ? 'selected' : ''}>Negocios</option>
                        <option value="vacaciones" ${this.userPreferences.tipoViaje === 'vacaciones' ? 'selected' : ''}>Vacaciones</option>
                        <option value="romantico" ${this.userPreferences.tipoViaje === 'romantico' ? 'selected' : ''}>Viaje Romántico</option>
                        <option value="familiar" ${this.userPreferences.tipoViaje === 'familiar' ? 'selected' : ''}>Viaje Familiar</option>
                        <option value="evento" ${this.userPreferences.tipoViaje === 'evento' ? 'selected' : ''}>Evento Especial</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="edit-comfort-level">Nivel de Comodidad Preferido</label>
                    <select id="edit-comfort-level" class="form-control">
                        <option value="">Seleccione su preferencia</option>
                        <option value="economico" ${this.userPreferences.nivelComodidad === 'economico' ? 'selected' : ''}>Económico</option>
                        <option value="estandar" ${this.userPreferences.nivelComodidad === 'estandar' ? 'selected' : ''}>Estándar</option>
                        <option value="superior" ${this.userPreferences.nivelComodidad === 'superior' ? 'selected' : ''}>Superior</option>
                        <option value="lujo" ${this.userPreferences.nivelComodidad === 'lujo' ? 'selected' : ''}>Lujo</option>
                        <option value="premium" ${this.userPreferences.nivelComodidad === 'premium' ? 'selected' : ''}>Premium</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Preferencias de Habitación</label>
                    <div class="preferences-grid">
                        ${this.createHabitacionesCheckboxes()}
                    </div>
                </div>

                <div class="form-group">
                    <label>Servicios que más utiliza</label>
                    <div class="preferences-grid">
                        ${this.createServiciosCheckboxes()}
                    </div>
                </div>

                <div class="form-group">
                    <label for="edit-special-requests">Solicitudes Especiales</label>
                    <textarea id="edit-special-requests" class="form-control" rows="3" placeholder="Alergias, necesidades especiales, celebraciones...">${this.userPreferences.solicitudesEspeciales || ''}</textarea>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    createHabitacionesCheckboxes() {
        const habitacionesOptions = [
            { value: 'vista-jardín', label: 'Vista al Jardín', icon: '🌿' },
            { value: 'vista-mar', label: 'Vista al Mar', icon: '🌊' },
            { value: 'vista-ciudad', label: 'Vista a la Ciudad', icon: '🏙️' },
            { value: 'piso-alto', label: 'Piso Alto', icon: '🏢' },
            { value: 'silenciosa', label: 'Zona Silenciosa', icon: '🔇' },
            { value: 'suite-lujo', label: 'Suite de Lujo', icon: '👑' },
            { value: 'accesible', label: 'Accesible', icon: '♿' }
        ];

        return habitacionesOptions.map(option => `
            <label class="preference-checkbox">
                <input type="checkbox" name="edit-habitaciones" value="${option.value}" 
                    ${this.userPreferences.habitaciones?.includes(option.value) ? 'checked' : ''}>
                <span class="checkmark"></span>
                <span class="preference-icon">${option.icon}</span>
                <span>${option.label}</span>
            </label>
        `).join('');
    }

    createServiciosCheckboxes() {
        const serviciosOptions = [
            { value: 'spa', label: 'Spa & Bienestar', icon: '💆' },
            { value: 'gimnasio', label: 'Gimnasio', icon: '💪' },
            { value: 'restaurante', label: 'Restaurante', icon: '🍽️' },
            { value: 'piscina', label: 'Piscina', icon: '🏊' },
            { value: 'bar', label: 'Bar', icon: '🍹' },
            { value: 'room-service', label: 'Room Service', icon: '🔔' },
            { value: 'business', label: 'Business Center', icon: '💼' },
            { value: 'eventos', label: 'Salón de Eventos', icon: '📅' }
        ];

        return serviciosOptions.map(option => `
            <label class="preference-checkbox">
                <input type="checkbox" name="edit-servicios" value="${option.value}" 
                    ${this.userPreferences.servicios?.includes(option.value) ? 'checked' : ''}>
                <span class="checkmark"></span>
                <span class="preference-icon">${option.icon}</span>
                <span>${option.label}</span>
            </label>
        `).join('');
    }

    async saveProfile() {
        try {
            // Recopilar datos del formulario
            const updatedPreferences = {
                tipoViaje: document.getElementById('edit-travel-type').value,
                nivelComodidad: document.getElementById('edit-comfort-level').value,
                habitaciones: this.getCheckedValues('edit-habitaciones'),
                servicios: this.getCheckedValues('edit-servicios'),
                solicitudesEspeciales: document.getElementById('edit-special-requests').value
            };

            // Validar datos requeridos
            if (!updatedPreferences.tipoViaje || !updatedPreferences.nivelComodidad) {
                alert('Por favor, complete todos los campos requeridos (Tipo de Viaje y Nivel de Comodidad)');
                return;
            }

            // Actualizar en Firebase
            const user = auth.currentUser;
            if (!user) {
                alert('Error: Usuario no autenticado');
                return;
            }

            await updateDoc(doc(db, "huespedes", user.uid), {
                preferencias: updatedPreferences,
                updatedAt: new Date()
            });

            // Actualizar datos locales
            this.userPreferences = updatedPreferences;
            this.userData.preferencias = updatedPreferences;

            // Salir del modo edición
            this.exitEditMode();

            // Mostrar mensaje de éxito
            this.showNotification('Preferencias actualizadas correctamente');

            console.log("✅ Preferencias actualizadas:", updatedPreferences);

        } catch (error) {
            console.error("Error al guardar preferencias:", error);
            alert('Error al guardar las preferencias. Por favor, intente nuevamente.');
        }
    }

    getCheckedValues(name) {
        const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }

    showNotification(message) {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        console.error("❌ Error:", message);
        alert(message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PerfilHuesped();
});