// Inicializa Firebase una sola vez
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDkLphXiCPe-KQ5RUiWdnmVRkKoiVPLBGM",
  authDomain: "proyectoweb-b462c.firebaseapp.com",
  projectId: "proyectoweb-b462c",
  storageBucket: "proyectoweb-b462c.firebasestorage.app",
  messagingSenderId: "147981943431",
  appId: "1:147981943431:web:20b26e8ffc8322c0a76e22"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };