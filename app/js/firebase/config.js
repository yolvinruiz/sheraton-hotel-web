// js/firebase/config.js - VERSIÓN COMPATIBLE
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyDkLphXiCPe-KQ5RUiWdnmVRkKoiVPLBGM",
  authDomain: "proyectoweb-b462c.firebaseapp.com",
  projectId: "proyectoweb-b462c",
  storageBucket: "proyectoweb-b462c.firebasestorage.app",
  messagingSenderId: "147981943431",
  appId: "1:147981943431:web:20b26e8ffc8322c0a76e22"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

console.log("✅ Firebase inicializado correctamente");

export { app, db, auth };