// app/js/main.js
import { AuthService } from './firebase/services/authService.js';

document.addEventListener('DOMContentLoaded', () => {
  const user = AuthService.getCurrentUser();
  const mensaje = document.getElementById('mensaje');
if (user) {
  console.log("Usuario logueado:", user.email);
  // Mostrar contenido privado
}
  
  if (user) {
    mensaje.innerHTML = `¡Bienvenido! <button onclick="logout()">Cerrar sesión</button>`;
  } else {
    mensaje.innerHTML = `
      <a href="/registro.html">Regístrate</a> o 
      <a href="/login.html">inicia sesión</a>
    `;
  }
});

// Función global para logout (simplificada)
window.logout = async () => {
  await import('./firebase/services/authService.js').then(module => {
    module.AuthService.logout().then(() => {
      window.location.reload();
    });
  });
};