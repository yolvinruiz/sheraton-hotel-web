// js/firebase/services/authService.js
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { auth } from '../config.js';

const googleProvider = new GoogleAuthProvider();

export class AuthService {
  static async registrar(email, password) {
    try {
      console.log("🔐 Intentando registrar:", email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("✅ Registro exitoso:", userCredential.user.uid);
      return userCredential;
    } catch (error) {
      console.error("❌ Error en registro:", error);
      throw error;
    }
  }

  static async login(email, password) {
    try {
      console.log("🔐 Intentando login:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Login exitoso:", userCredential.user.uid);
      return userCredential;
    } catch (error) {
      console.error("❌ Error en login:", error);
      throw error;
    }
  }

  static async logout() {
    try {
      await signOut(auth);
      console.log("✅ Logout exitoso");
    } catch (error) {
      console.error("❌ Error en logout:", error);
      throw error;
    }
  }

  static async loginConGoogle() {
    try {
      console.log("🔐 Intentando login con Google");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("✅ Login con Google exitoso:", result.user.uid);
      return result;
    } catch (error) {
      console.error("❌ Error con Google login:", error);
      throw error;
    }
  }

  static getCurrentUser() {
    return auth.currentUser;
  }

  static onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
  }
}