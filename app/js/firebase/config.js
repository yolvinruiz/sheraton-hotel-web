// js/firebase/config.js

// ✅ Firebase v9 modular (la versión correcta)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// ✅ Tu configuración
const firebaseConfig = {
  apiKey: "AIzaSyDkLphXiCPe-KQ5RUiWdnmVRkKoiVPLBGM",
  authDomain: "proyectoweb-b462c.firebaseapp.com",
  projectId: "proyectoweb-b462c",
  storageBucket: "proyectoweb-b462c.firebasestorage.app",
  messagingSenderId: "147981943431",
  appId: "1:147981943431:web:20b26e8ffc8322c0a76e22"
};

// ✅ Inicializar Firebase UNA SOLA VEZ
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ✅ Confirmación
console.log("✅ Firebase inicializado correctamente (v9)");

export { 
  app, 
  db, 
  auth,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  onAuthStateChanged,
  signInWithEmailAndPassword
};
