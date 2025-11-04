// js/firebase/services/authService.js
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { app } from '../config.js';

const auth = getAuth(app);

export const AuthService = {
  async registrar(email, password) {
    return await createUserWithEmailAndPassword(auth, email, password);
  },

  async login(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
  },

  async loginConGoogle() {
    
    const provider = new GoogleAuthProvider();
    // Agregar scopes adicionales si es necesario
    provider.addScope('email');
    provider.addScope('profile');
    return await signInWithPopup(auth, provider);
  },

  async logout() {
    return await signOut(auth);
  },

  getUsuarioActual() {
    return auth.currentUser;
  },

  // Nuevo método para observar cambios de estado
  onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
  }
};