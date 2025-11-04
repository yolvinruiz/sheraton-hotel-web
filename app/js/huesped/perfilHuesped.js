// js/huesped/perfilHuesped.js
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { app } from '../firebase/config.js';

const auth = getAuth();
const db = getFirestore(app);

class PerfilHuesped {
    constructor() {
        this.userData = null;
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
            }
        } catch (error) {
            console.error("Error al cargar datos del usuario:", error);
        }
    }

    renderProfile() {
        if (!this.userData) return;

        document.getElementById('profile-avatar').textContent = 
            this.userData.nombre.charAt(0) + this.userData.apellidos.charAt(0);
        document.getElementById('profile-name').textContent = 
            `${this.userData.nombre} ${this.userData.apellidos}`;
        document.getElementById('profile-dni').textContent = this.userData.dni;
        document.getElementById('profile-email').textContent = this.userData.email;
        document.getElementById('profile-phone').textContent = this.userData.telefono;
        document.getElementById('profile-age').textContent = `${this.userData.edad} años`;
        document.getElementById('profile-gender').textContent = 
            this.userData.genero === 'male' ? 'Masculino' : 'Femenino';
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
            alert('Funcionalidad de edición en desarrollo...');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PerfilHuesped();
});