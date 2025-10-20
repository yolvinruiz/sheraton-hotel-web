// js/login.js
import { AuthService } from './firebase/services/authService.js';

document.addEventListener('DOMContentLoaded', () => {
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
        await AuthService.login(email, password);
        mensaje.textContent = '✅ ¡Bienvenido! Redirigiendo...';
        mensaje.style.color = 'green';

        setTimeout(() => {
          window.location.href = 'logeado.html';
        }, 1500);
      } catch (error) {
        console.error('Error en login:', error);
        let msg = '❌ Error: ';
        if (error.code === 'auth/invalid-credential') {
          msg += 'Email o contraseña incorrectos.';
        } else {
          msg += 'Inténtalo de nuevo.';
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
        await AuthService.loginConGoogle();
        mensaje.textContent = '✅ ¡Bienvenido con Google! Redirigiendo...';
        mensaje.style.color = 'green';

        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } catch (error) {
        console.error('Error con Google:', error);
        let msg = '❌ Error con Google: ';
        if (error.code === 'auth/popup-closed-by-user') {
          msg += 'Ventana cerrada por el usuario.';
        } else {
          msg += 'No se pudo iniciar sesión.';
        }
        mensaje.textContent = msg;
        mensaje.style.color = 'red';
      }
    });
  }
});