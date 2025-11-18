// js/huesped/historialHuesped.js
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { app, db } from '../firebase/config.js';

const auth = getAuth(app);

class HistorialHuesped {
    constructor() {
        this.userData = null;
        this.historial = [];
        
        this.init();
    }

    async init() {
        await this.checkAuth();
        await this.loadUserData();
        this.renderHistorial();
        this.renderResumen();
    }

    async checkAuth() {
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    console.log("👤 Usuario autenticado para historial:", user.uid);
                    await this.loadUserData(user.uid);
                    resolve();
                } else {
                    console.log("❌ No hay usuario autenticado, redirigiendo...");
                    window.location.href = '/index.html';
                }
            });
        });
    }

    async loadUserData(uid = null) {
        try {
            const userId = uid || auth.currentUser.uid;
            console.log("📥 Cargando datos del huésped para historial:", userId);
            
            const userDoc = await getDoc(doc(db, "huespedes", userId));
            
            if (userDoc.exists()) {
                this.userData = userDoc.data();
                this.historial = this.userData.historial?.reservasRealizadas || [];
                console.log("✅ Historial cargado:", this.historial);
                
                this.renderUserInfo();
            } else {
                console.log("❌ No se encontró el perfil del huésped");
            }
        } catch (error) {
            console.error("Error al cargar datos del usuario:", error);
        }
    }

    renderUserInfo() {
        try {
            const userNameElement = document.getElementById('user-name');
            const userAvatarElement = document.getElementById('user-avatar');

            if (userNameElement && this.userData) {
                const nombreCompleto = `${this.userData.nombre || ''} ${this.userData.apellidos || ''}`.trim();
                userNameElement.textContent = nombreCompleto || this.userData.email;
            }

            if (userAvatarElement && this.userData) {
                const iniciales = (this.userData.nombre?.charAt(0) || '') + (this.userData.apellidos?.charAt(0) || '');
                userAvatarElement.textContent = iniciales || 'HU';
            }
        } catch (error) {
            console.error("Error al renderizar información del usuario:", error);
        }
    }

    renderResumen() {
        // Total de reservas
        document.getElementById('total-reservas').textContent = this.historial.length;
        
        // Total gastado
        const totalGastado = this.historial.reduce((total, reserva) => total + (reserva.total || 0), 0);
        document.getElementById('total-gastado').textContent = `S/ ${totalGastado}`;
        
        // Servicios utilizados
        const serviciosUtilizados = this.userData?.historial?.serviciosUtilizados?.length || 0;
        document.getElementById('servicios-utilizados').textContent = serviciosUtilizados;
        
        // Última visita
        const ultimaVisita = this.userData?.historial?.ultimaVisita;
        if (ultimaVisita) {
            const fecha = new Date(ultimaVisita.seconds * 1000);
            document.getElementById('ultima-visita').textContent = fecha.toLocaleDateString('es-ES');
        }
    }

    renderHistorial() {
        const container = document.getElementById('historial-container');
        if (!container) return;

        if (this.historial.length === 0) {
            container.innerHTML = `
                <div class="no-historial">
                    <i class="fas fa-history"></i>
                    <h3>No hay historial de reservas</h3>
                    <p>Cuando realices reservas, aparecerán aquí</p>
                    <a href="huesped.html" class="btn" style="margin-top: 20px;">
                        <i class="fas fa-bed"></i> Hacer una Reserva
                    </a>
                </div>
            `;
            return;
        }

        // Ordenar reservas por fecha más reciente primero
        const historialOrdenado = [...this.historial].sort((a, b) => {
            const fechaA = new Date(a.fechaReserva?.seconds * 1000 || a.fechaReserva);
            const fechaB = new Date(b.fechaReserva?.seconds * 1000 || b.fechaReserva);
            return fechaB - fechaA;
        });

        let html = '';
        
        historialOrdenado.forEach(reserva => {
            const fechaReserva = reserva.fechaReserva?.seconds 
                ? new Date(reserva.fechaReserva.seconds * 1000)
                : new Date(reserva.fechaReserva);
            
            const fechaCheckin = new Date(reserva.checkin);
            const fechaCheckout = new Date(reserva.checkout);
            
            const noches = Math.ceil((fechaCheckout - fechaCheckin) / (1000 * 60 * 60 * 24));
            
            // Determinar clase del estado
            let estadoClass = '';
            let estadoText = '';
            switch(reserva.estado) {
                case 'confirmada':
                    estadoClass = 'estado-confirmada';
                    estadoText = 'Confirmada';
                    break;
                case 'activa':
                    estadoClass = 'estado-activa';
                    estadoText = 'Activa';
                    break;
                case 'completada':
                    estadoClass = 'estado-completada';
                    estadoText = 'Completada';
                    break;
                default:
                    estadoClass = 'estado-completada';
                    estadoText = reserva.estado || 'Completada';
            }

            html += `
                <div class="reserva-card">
                    <div class="reserva-header">
                        <div>
                            <span class="reserva-codigo">${reserva.codigoReserva || 'Sin código'}</span>
                            <span class="reserva-estado ${estadoClass}">${estadoText}</span>
                        </div>
                        <div style="color: #666; font-size: 0.9rem;">
                            Reserva realizada: ${fechaReserva.toLocaleDateString('es-ES')}
                        </div>
                    </div>
                    
                    <div class="reserva-info">
                        <div class="info-item">
                            <span class="info-label">Habitación</span>
                            <span class="info-value">${reserva.habitacion}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Check-in / Check-out</span>
                            <span class="info-value">
                                ${fechaCheckin.toLocaleDateString('es-ES')} - ${fechaCheckout.toLocaleDateString('es-ES')}
                            </span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Noches</span>
                            <span class="info-value">${noches} noche${noches !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Total</span>
                            <span class="info-value" style="color: #28a745; font-weight: bold;">
                                S/ ${reserva.total || '0'}
                            </span>
                        </div>
                    </div>
                    
                    ${reserva.unidadNumero ? `
                        <div class="info-item">
                            <span class="info-label">Número de Habitación</span>
                            <span class="info-value">${reserva.unidadNumero}</span>
                        </div>
                    ` : ''}
                    
                    ${this.userData?.historial?.serviciosUtilizados?.length > 0 ? `
                        <div class="servicios-list">
                            <div class="servicios-title">Servicios Utilizados:</div>
                            ${this.userData.historial.serviciosUtilizados.map(servicio => 
                                `<span class="servicio-tag">${servicio}</span>`
                            ).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log("📚 Inicializando HistorialHuesped...");
    new HistorialHuesped();
});