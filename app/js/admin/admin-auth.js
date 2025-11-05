import { auth, db } from "../firebase/config.js";
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
    doc, setDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.showRegister = () => {
    document.getElementById("login-card").style.display = "none";
    document.getElementById("register-card").style.display = "block";
}

window.showLogin = () => {
    document.getElementById("register-card").style.display = "none";
    document.getElementById("login-card").style.display = "block";
}

document.getElementById("btn-login").addEventListener("click", async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const errorBox = document.getElementById("login-error");

    try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCred.user.uid;

        const adminDoc = await getDoc(doc(db, "administradores", uid));

        if (!adminDoc.exists()) {
            errorBox.textContent = "No tienes permisos de administrador.";
            errorBox.style.display = "block";
            return;
        }

        if (adminDoc.data().estado !== "activo") {
            errorBox.textContent = "Tu cuenta está desactivada.";
            errorBox.style.display = "block";
            return;
        }

        window.location.href = "/admin/dashboard.html";

    } catch (error) {
        errorBox.textContent = "Credenciales inválidas.";
        errorBox.style.display = "block";
    }
});


document.getElementById("btn-register").addEventListener("click", async () => {
    const nombre = document.getElementById("reg-nombre").value;
    const apellidos = document.getElementById("reg-apellidos").value;
    const dni = document.getElementById("reg-dni").value;
    const telefono = document.getElementById("reg-telefono").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const clave = document.getElementById("clave-admin").value;

    const errorBox = document.getElementById("register-error");

    if (clave !== "240504") {
        errorBox.textContent = "Clave de acceso incorrecta. Registro denegado.";
        errorBox.style.display = "block";
        return;
    }

    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCred.user.uid;

        await setDoc(doc(db, "administradores", uid), {
            uid,
            nombre,
            apellidos,
            dni,
            telefono,
            email,
            estado: "activo",
            rol: "admin"
        });

        alert("Administrador registrado correctamente.");
        showLogin();

    } catch (error) {
        errorBox.textContent = "Error al registrar: " + error.message;
        errorBox.style.display = "block";
    }
});
