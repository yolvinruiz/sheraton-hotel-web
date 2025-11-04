// js/huesped/homeHuesped.js - VERSIÓN CORREGIDA
import { TipoHabitacionService } from '../firebase/services/tipoHabitacionService.js';
import { UnidadHabitacionService } from '../firebase/services/unidadHabitacionService.js';
import { ServicioService } from '../firebase/services/servicioService.js';
import { CategoriaService } from '../firebase/services/categoriaService.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { app } from '../firebase/config.js';

const auth = getAuth(app);
const db = getFirestore(app);

class HomeHuesped {
    constructor() {
        this.rooms = [];
        this.services = [];
        this.categories = [];
        this.filteredRooms = [];
        this.filteredServices = [];
        this.selectedServices = [];
        this.currentUser = null;
        this.userData = null;

        this.init();
    }

    async init() {
        await this.checkAuth();
        this.bindEvents();
        await this.loadData();
        this.setDefaultDates();
    }

    async checkAuth() {
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    this.currentUser = user;
                    console.log("👤 Usuario autenticado:", user.uid);
                    await this.loadUserData(user.uid);
                    resolve();
                } else {
                    console.log("❌ No hay usuario autenticado, redirigiendo...");
                    window.location.href = '/index.html';
                }
            });
        });
    }

    async loadUserData(uid) {
        try {
            console.log("📥 Cargando datos del huésped con UID:", uid);
            const userDoc = await getDoc(doc(db, "huespedes", uid));
            
            if (userDoc.exists()) {
                this.userData = userDoc.data();
                console.log("✅ Datos del huésped cargados:", this.userData);
                this.renderUserInfo();
            } else {
                console.log("❌ No se encontró el perfil del huésped en Firestore");
                // Crear perfil automáticamente si no existe
                await this.crearPerfilHuesped(uid, this.currentUser.email);
            }
        } catch (error) {
            console.error("Error al cargar datos del usuario:", error);
        }
    }

    async crearPerfilHuesped(uid, email) {
        try {
            const datosHuesped = {
                email: email,
                nombre: email.split('@')[0],
                apellidos: '',
                dni: '',
                telefono: '',
                edad: 0,
                genero: '',
                createdAt: new Date(),
                estado: 'activo'
            };

            await setDoc(doc(db, "huespedes", uid), datosHuesped);
            console.log("✅ Perfil de huésped creado automáticamente");
            this.userData = datosHuesped;
            this.renderUserInfo();
        } catch (error) {
            console.error('Error al crear perfil de huésped:', error);
        }
    }

    renderUserInfo() {
        if (!this.userData) {
            console.log("⚠️ No hay datos de usuario para mostrar");
            return;
        }

        try {
            // Actualizar nombre en el header
            const userNameElement = document.getElementById('user-name');
            const userAvatarElement = document.getElementById('user-avatar');

            if (userNameElement) {
                userNameElement.textContent = `${this.userData.nombre} ${this.userData.apellidos}`;
                console.log("✅ Nombre actualizado:", userNameElement.textContent);
            }

            if (userAvatarElement) {
                const iniciales = (this.userData.nombre?.charAt(0) || '') + (this.userData.apellidos?.charAt(0) || '');
                userAvatarElement.textContent = iniciales || 'HU';
                console.log("✅ Avatar actualizado:", userAvatarElement.textContent);
            }
        } catch (error) {
            console.error("Error al renderizar información del usuario:", error);
        }
    }

    // ... (el resto de los métodos bindEvents, loadData, etc. permanecen igual)
    async loadData() {
        try {
            console.log("📥 Cargando datos de habitaciones y servicios...");
            const [tipos, servicios, categorias] = await Promise.all([
                TipoHabitacionService.listar(),
                ServicioService.listar(),
                CategoriaService.listar()
            ]);

            // Cargar unidades para ver disponibilidad
            const unidadesPromises = tipos.map(async (tipo) => {
                const unidades = await UnidadHabitacionService.listarPorTipo(tipo.id);
                return {
                    ...tipo,
                    unidades: unidades,
                    disponible: unidades.some(u => u.estado === 'disponible')
                };
            });

            this.rooms = await Promise.all(unidadesPromises);
            this.services = servicios.filter(s => s.estado === 'activo');
            this.categories = categorias;

            this.filteredRooms = this.rooms.filter(room => room.disponible);
            this.filteredServices = this.services;

            this.renderRooms(this.filteredRooms);
            this.renderServices(this.filteredServices);
            this.renderRoomTypeFilters();

            console.log("✅ Datos cargados correctamente");

        } catch (error) {
            console.error("Error al cargar datos:", error);
            this.showError("Error al cargar los datos. Por favor, recarga la página.");
        }
    }

    bindEvents() {
        console.log("🔗 Configurando eventos...");
        
        // Toggle menu for mobile
        document.querySelector('.menu-toggle')?.addEventListener('click', () => {
            document.querySelector('.nav-links').classList.toggle('active');
        });

        // Toggle user menu
        const userMenuToggle = document.getElementById('user-menu-toggle');
        const userMenu = document.getElementById('user-menu');
        
        userMenuToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('active');
        });

        // Close user menu when clicking outside
        document.addEventListener('click', () => {
            userMenu.classList.remove('active');
        });

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            if(confirm('¿Está seguro de que desea cerrar sesión?')) {
                signOut(auth).then(() => {
                    window.location.href = '/index.html';
                });
            }
        });

        // Profile button
        document.getElementById('perfil-btn')?.addEventListener('click', () => {
            window.location.href = 'perfil.html';
        });

        console.log("✅ Eventos configurados");
    }

    setDefaultDates() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        document.getElementById('checkin').valueAsDate = today;
        document.getElementById('checkout').valueAsDate = tomorrow;
    }

    // ... (otros métodos renderRooms, renderServices, etc.)
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Inicializando HomeHuesped...");
    window.homeHuesped = new HomeHuesped();
});