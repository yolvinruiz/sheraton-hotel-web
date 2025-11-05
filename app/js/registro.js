// js/registro.js - VERSIÓN CORREGIDA
import { AuthService } from './firebase/services/authService.js';
import { HuespedService } from './firebase/services/huespedService.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  if (!form) {
    console.log("❌ Formulario de registro no encontrado");
    return;
  }

  console.log("✅ Formulario de registro cargado");

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Información personal
    const firstname = document.getElementById('register-firstname').value;
    const lastname = document.getElementById('register-lastname').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const dni = document.getElementById('register-dni').value;
    const telefono = document.getElementById('register-telefono').value;
    const genero = document.getElementById('register-gender').value;
    const edad = document.getElementById('register-age').value;

    // Preferencias de viaje
    const travelType = document.getElementById('register-travel-type').value;
    const comfortLevel = document.getElementById('register-comfort').value;
    const specialRequests = document.getElementById('register-special-requests').value;

    // Obtener preferencias de habitación
    const roomPreferences = [];
    document.querySelectorAll('input[name="room-preference"]:checked').forEach(checkbox => {
        roomPreferences.push(checkbox.value);
    });

    // Obtener preferencias de servicios
    const servicePreferences = [];
    document.querySelectorAll('input[name="service-preference"]:checked').forEach(checkbox => {
        servicePreferences.push(checkbox.value);
    });

    // Validaciones
    if (roomPreferences.length === 0) {
        alert('Por favor seleccione al menos una preferencia de habitación');
        return;
    }

    if (servicePreferences.length === 0) {
        alert('Por favor seleccione al menos un servicio que utiliza');
        return;
    }

    if (!travelType) {
        alert('Por favor seleccione el tipo de viaje');
        return;
    }

    if (!comfortLevel) {
        alert('Por favor seleccione su nivel de comodidad preferido');
        return;
    }

    // Crear mensaje dinámico
    let mensaje = document.getElementById('mensaje-registro');
    if (!mensaje) {
      mensaje = document.createElement('div');
      mensaje.id = 'mensaje-registro';
      mensaje.style.marginTop = '15px';
      mensaje.style.textAlign = 'center';
      mensaje.style.padding = '10px';
      mensaje.style.borderRadius = '4px';
      form.appendChild(mensaje);
    }

    mensaje.textContent = 'Registrando y creando perfil personalizado...';
    mensaje.style.background = '#e3f2fd';
    mensaje.style.color = '#004792';

    try {
      console.log("🚀 Iniciando proceso de registro...");
      const userCredential = await AuthService.registrar(email, password);
      const userId = userCredential.user.uid;
      
      console.log("📝 Creando perfil con preferencias...");
      // Guardar perfil con preferencias
      await HuespedService.guardarPerfil(userId, {
        // Información básica
        nombre: firstname,
        apellidos: lastname,
        email: email,
        dni: dni,
        telefono: telefono,
        genero: genero,
        edad: parseInt(edad),
        
        // Preferencias para recomendaciones
        preferencias: {
          tipoViaje: travelType,
          nivelComodidad: comfortLevel,
          habitaciones: roomPreferences,
          servicios: servicePreferences,
          solicitudesEspeciales: specialRequests
        },
        
        // Historial para mejoras futuras
        historial: {
          reservas: 0,
          ultimaVisita: null,
          serviciosUtilizados: [],
          reservasRealizadas: []
        },
        
        // Configuración de recomendaciones
        configuracion: {
          recibirRecomendaciones: true,
          notificacionesPersonalizadas: true
        },
        
        // Metadatos
        createdAt: new Date(),
        updatedAt: new Date(),
        estado: 'activo'
      });

      mensaje.textContent = '✅ ¡Registro exitoso! Hemos guardado tus preferencias para recomendarte lo mejor.';
      mensaje.style.background = '#d4edda';
      mensaje.style.color = '#155724';

      console.log("✅ Registro completado exitosamente");

      setTimeout(() => {
        // Cambiar a pestaña de login automáticamente
        const loginTab = document.querySelector('.tab[data-tab="login"]');
        if (loginTab) {
          loginTab.click();
        }
        
        // Limpiar formulario
        form.reset();
        
        // Opcional: Auto-rellenar login
        setTimeout(() => {
          const loginEmail = document.getElementById('login-email');
          const loginPassword = document.getElementById('login-password');
          if (loginEmail && loginPassword) {
            loginEmail.value = email;
            loginPassword.value = password;
          }
        }, 500);
        
      }, 2000);

    } catch (error) {
      console.error('Error en registro:', error);
      let msg = '❌ Error: ';
      
      if (error.code === 'auth/email-already-in-use') {
        msg += 'Este email ya está registrado. Por favor inicia sesión.';
      } else if (error.code === 'auth/invalid-email') {
        msg += 'Formato de email inválido.';
      } else if (error.code === 'auth/weak-password') {
        msg += 'La contraseña debe tener al menos 6 caracteres.';
      } else if (error.code === 'auth/network-request-failed') {
        msg += 'Error de conexión. Verifique su internet.';
      } else {
        msg += error.message || 'Inténtalo de nuevo.';
      }
      
      mensaje.textContent = msg;
      mensaje.style.background = '#f8d7da';
      mensaje.style.color = '#721c24';
    }
  });

  // Validación en tiempo real de preferencias
  const preferenceCheckboxes = document.querySelectorAll('input[type="checkbox"]');
  preferenceCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', validarPreferencias);
  });

  function validarPreferencias() {
    const roomChecked = document.querySelectorAll('input[name="room-preference"]:checked').length;
    const serviceChecked = document.querySelectorAll('input[name="service-preference"]:checked').length;
    
    const submitBtn = document.querySelector('#register-form button[type="submit"]');
    
    if (roomChecked > 0 && serviceChecked > 0) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    } else {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';
      submitBtn.style.cursor = 'not-allowed';
    }
  }

  // Inicializar validación
  validarPreferencias();
  console.log("✅ Validación de preferencias inicializada");
});