// js/admin/adminLogin.js
import { auth, db } from "../firebase/config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.getElementById("btnLoginAdmin").addEventListener("click", loginAdmin);

async function loginAdmin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("errorMsg");

  errorMsg.textContent = "";

  if (!email || !password) {
    errorMsg.textContent = "Complete todos los campos.";
    return;
  }

  try {
    // ✅ LOGIN EN FIREBASE AUTH
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ✅ VERIFICAR SI ES ADMIN
    const ref = doc(db, "administrador", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      errorMsg.textContent = "No tienes permisos de administrador.";
      return;
    }

    const data = snap.data();

    if (data.rol !== "admin") {
      errorMsg.textContent = "Acceso restringido. Rol no válido.";
      return;
    }

    if (data.estado !== "activo") {
      errorMsg.textContent = "Tu cuenta está inactiva.";
      return;
    }

    // ✅ GUARDAR DATOS DEL ADMIN EN LOCALSTORAGE
    localStorage.setItem("adminData", JSON.stringify(data));

    // ✅ REDIRIGIR AL PANEL
    window.location.href = "/admin-habitaciones.html";

  } catch (error) {
    console.error(error);
    errorMsg.textContent = "Credenciales incorrectas o cuenta inexistente.";
  }
}
