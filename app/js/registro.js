// js/registro.js
import { AuthService } from './firebase/services/authService.js';
import { HuespedService } from './firebase/services/huespedService.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstname = document.getElementById('register-firstname').value;
    const lastname = document.getElementById('register-lastname').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const dni = document.getElementById('register-dni').value;
    const telefono = document.getElementById('register-telefono').value;
    const genero = document.getElementById('register-gender').value;
    const edad = document.getElementById('register-age').value;

    // Crear mensaje dinámico
    let mensaje = document.getElementById('mensaje-registro');
    if (!mensaje) {
      mensaje = document.createElement('div');
      mensaje.id = 'mensaje-registro';
      mensaje.style.marginTop = '15px';
      mensaje.style.textAlign = 'center';
      form.appendChild(mensaje);
    }

    mensaje.textContent = 'Registrando...';
    mensaje.style.color = '#004792';

    try {
      const userCredential = await AuthService.registrar(email, password);
      await HuespedService.guardarPerfil(userCredential.user.uid, {
        nombre: firstname,
        apellidos: lastname,
        email,
        dni,
        telefono,
        genero,
        edad: parseInt(edad)
      });

      mensaje.textContent = '✅ Registro exitoso. Redirigiendo...';
      mensaje.style.color = 'green';

      setTimeout(() => {
        // Cambiar a pestaña de login
        document.querySelector('.tab[data-tab="login"]').click();
        mensaje.remove();
      }, 1500);

    } catch (error) {
      console.error('Error en registro:', error);
      let msg = '❌ Error: ';
      if (error.code === 'auth/email-already-in-use') {
        msg += 'Este email ya está registrado.';
      } else if (error.code === 'auth/invalid-email') {
        msg += 'Formato de email inválido.';
      } else if (error.code === 'auth/weak-password') {
        msg += 'La contraseña debe tener al menos 6 caracteres.';
      } else {
        msg += 'Inténtalo de nuevo.';
      }
      mensaje.textContent = msg;
      mensaje.style.color = 'red';
    }
  });
});