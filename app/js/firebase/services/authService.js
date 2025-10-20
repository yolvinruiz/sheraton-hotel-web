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
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  },

  getUsuarioActual() {
    return auth.currentUser;
  }
};