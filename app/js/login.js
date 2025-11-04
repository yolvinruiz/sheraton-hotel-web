// js/login.js - VERSIÓN CORREGIDA
import { AuthService } from './firebase/services/authService.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { app } from './firebase/config.js';

const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
  // Función para crear perfil de huésped automáticamente
  async function crearPerfilHuesped(uid, email) {
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
      return datosHuesped;
    } catch (error) {
      console.error('Error al crear perfil de huésped:', error);
      throw error;
    }
  }

  // Función para determinar el tipo de usuario y redirigir
  async function determinarYRederigir(uid, email) {
    try {
      console.log("🔍 Verificando usuario con UID:", uid);

      // Verificar si es huésped
      const huespedDoc = await getDoc(doc(db, "huespedes", uid));
      console.log("¿Existe en huespedes?", huespedDoc.exists());
      
      if (huespedDoc.exists()) {
        console.log("✅ Usuario encontrado en huespedes");
        return 'huesped.html'; // Con .html
      } 

      // Verificar si es administrador
      const adminDoc = await getDoc(doc(db, "administradores", uid));
      console.log("¿Existe en administradores?", adminDoc.exists());
      
      if (adminDoc.exists()) {
        console.log("✅ Usuario encontrado en administradores");
        return 'admin-habitaciones.html'; // Con .html
      }

      // Si no está en ninguna colección, crear perfil de huésped automáticamente
      console.log("🆕 Creando perfil de huésped automáticamente...");
      await crearPerfilHuesped(uid, email);
      return 'huesped.html'; // Con .html

    } catch (error) {
      console.error('Error al determinar el tipo de usuario:', error);
      return 'huesped.html'; // Con .html
    }
  }

  // Login con email/contraseña
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      let mensaje = document.getElementById('mensaje-login');
      if (!mensaje) {
        mensaje = document.createElement('div');
        mensaje.id = 'mensaje-login';
        mensaje.style.marginTop = '15px';
        mensaje.style.textAlign = 'center';
        loginForm.appendChild(mensaje);
      }

      mensaje.textContent = 'Iniciando sesión...';
      mensaje.style.color = '#004792';

      try {
        const userCredential = await AuthService.login(email, password);
        const user = userCredential.user;
        
        console.log("🚀 Login exitoso, usuario:", user);
        
        if (user) {
          const redirectUrl = await determinarYRederigir(user.uid, user.email);
          mensaje.textContent = '✅ ¡Bienvenido! Redirigiendo...';
          mensaje.style.color = 'green';

          setTimeout(() => {
            console.log("🔄 Redirigiendo a:", redirectUrl);
            window.location.href = redirectUrl;
          }, 1500);
        } else {
          throw new Error('No se pudo obtener información del usuario');
        }
      } catch (error) {
        console.error('Error en login:', error);
        let msg = '❌ Error: ';
        
        if (error.code === 'auth/invalid-credential') {
          msg += 'Email o contraseña incorrectos.';
        } else if (error.code === 'auth/user-not-found') {
          msg += 'Usuario no encontrado.';
        } else if (error.code === 'auth/wrong-password') {
          msg += 'Contraseña incorrecta.';
        } else if (error.code === 'auth/too-many-requests') {
          msg += 'Demasiados intentos. Intenta más tarde.';
        } else {
          msg += error.message || 'Inténtalo de nuevo.';
        }
        
        mensaje.textContent = msg;
        mensaje.style.color = 'red';
      }
    });
  }

  // Login con Google
  const googleBtn = document.getElementById('google-login-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      let mensaje = document.getElementById('mensaje-google');
      if (!mensaje) {
        mensaje = document.createElement('div');
        mensaje.id = 'mensaje-google';
        mensaje.style.marginTop = '15px';
        mensaje.style.textAlign = 'center';
        document.querySelector('#login-tab .modal-body').appendChild(mensaje);
      }

      mensaje.textContent = 'Iniciando sesión con Google...';
      mensaje.style.color = '#DB4437';

      try {
        const userCredential = await AuthService.loginConGoogle();
        const user = userCredential.user;
        
        console.log("🚀 Login con Google exitoso, usuario:", user);
        
        if (user) {
          const redirectUrl = await determinarYRederigir(user.uid, user.email);
          mensaje.textContent = '✅ ¡Bienvenido con Google! Redirigiendo...';
          mensaje.style.color = 'green';

          setTimeout(() => {
            console.log("🔄 Redirigiendo a:", redirectUrl);
            window.location.href = redirectUrl;
          }, 1500);
        } else {
          throw new Error('No se pudo obtener información del usuario');
        }
      } catch (error) {
        console.error('Error con Google:', error);
        let msg = '❌ Error con Google: ';
        if (error.code === 'auth/popup-closed-by-user') {
          msg += 'Ventana cerrada por el usuario.';
        } else if (error.code === 'auth/popup-blocked') {
          msg += 'El popup fue bloqueado por el navegador.';
        } else if (error.code === 'auth/unauthorized-domain') {
          msg += 'Dominio no autorizado. Contacta al administrador.';
        } else {
          msg += error.message || 'No se pudo iniciar sesión.';
        }
        mensaje.textContent = msg;
        mensaje.style.color = 'red';
      }
    });
  }

  // Verificar sesión activa al cargar la página
  function verificarSesionActiva() {
    const auth = getAuth();
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log("🔍 Sesión activa detectada, verificando...");
        try {
          const redirectUrl = await determinarYRederigir(user.uid, user.email);
          
          // Evitar redirección infinita si ya está en la página correcta
          const currentPath = window.location.pathname;
          const targetPath = redirectUrl;
          
          console.log("📍 Current path:", currentPath, "Target path:", targetPath);
          
          if (!currentPath.includes(targetPath) && 
              currentPath !== '/index.html' && 
              currentPath !== '/') {
            console.log("🔄 Redirigiendo a:", redirectUrl);
            window.location.href = redirectUrl;
          }
        } catch (error) {
          console.error('Error al verificar sesión activa:', error);
        }
      }
    });
  }

  // Verificar sesión activa
  verificarSesionActiva();
});