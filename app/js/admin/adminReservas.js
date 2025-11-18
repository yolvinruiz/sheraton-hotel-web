// js/admin/adminReservas.js
import { ReservaService } from '../firebase/services/reservaService.js';
import { UnidadHabitacionService } from '../firebase/services/unidadHabitacionService.js';
import { TipoHabitacionService } from '../firebase/services/tipoHabitacionService.js';

class AdminReservas {
  constructor() {
    this.modales = {
      reserva: document.getElementById('modal-reserva'),
      detalles: document.getElementById('modal-detalles-reserva')
    };
    this.botones = {
      agregarReserva: document.getElementById('btn-agregar-reserva')
    };
    this.formularios = {
      reserva: document.getElementById('form-reserva')
    };
    this.contenedores = {
      resultados: document.getElementById('resultados-container'),
      detalles: document.getElementById('detalles-reserva-container'),
      resumen: document.getElementById('resumen-reserva')
    };

    this.reservasEnMemoria = [];
    this.habitacionesDisponibles = [];
    this.tiposHabitacion = [];

    this.init();
  }

  init() {
    this.bindEvents();
    this.cargarYMostrarReservas();
    this.cargarHabitacionesParaFiltros();

    // Exponer métodos globalmente
    window.adminReservas = {
      verDetalles: (id) => this.verDetallesReserva(id),
      editarReserva: (id) => this.editarReserva(id),
      eliminarReserva: (id) => this.eliminarReserva(id),
      cambiarEstado: (id, nuevoEstado) => this.cambiarEstadoReserva(id, nuevoEstado)
    };
  }

  bindEvents() {
    this.botones.agregarReserva?.addEventListener('click', () => this.abrirModalReserva());
    this.formularios.reserva?.addEventListener('submit', (e) => this.guardarReserva(e));

    // Búsqueda en tiempo real
    document.getElementById('busqueda-reservas')?.addEventListener('input', (e) => {
      this.buscarReservas(e.target.value);
    });

    // Filtros
    document.getElementById('filtro-estado')?.addEventListener('change', () => this.aplicarFiltros());
    document.getElementById('filtro-checkin')?.addEventListener('change', () => this.aplicarFiltros());
    document.getElementById('filtro-checkout')?.addEventListener('change', () => this.aplicarFiltros());
    document.getElementById('filtro-habitacion')?.addEventListener('change', () => this.aplicarFiltros());

    // Eventos para calcular resumen
    document.getElementById('reserva-habitacionId')?.addEventListener('change', () => this.calcularResumen());
    document.getElementById('reserva-checkin')?.addEventListener('change', () => this.calcularResumen());
    document.getElementById('reserva-checkout')?.addEventListener('change', () => this.calcularResumen());

    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => this.cerrarTodosLosModales());
    });
    
    Object.values(this.modales).forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.cerrarTodosLosModales();
      });
    });
  }

  // === MÉTODOS PRINCIPALES ===
  async cargarYMostrarReservas() {
    try {
      this.contenedores.resultados.innerHTML = '<p>Cargando reservas...</p>';
      const reservas = await ReservaService.listar();
      this.reservasEnMemoria = reservas;
      this.renderReservas(reservas);
    } catch (error) {
      console.error("Error al cargar reservas:", error);
      this.contenedores.resultados.innerHTML = '<p class="error">❌ Error al cargar las reservas</p>';
    }
  }

  async cargarHabitacionesParaFiltros() {
    try {
      const unidades = await UnidadHabitacionService.listarTodas();
      const tipos = await TipoHabitacionService.listar();
      
      this.habitacionesDisponibles = unidades;
      this.tiposHabitacion = tipos;
      
      // Llenar select de filtros
      const selectFiltro = document.getElementById('filtro-habitacion');
      selectFiltro.innerHTML = '<option value="">Todas las habitaciones</option>';
      
      unidades.forEach(u => {
        const tipo = tipos.find(t => t.id === u.tipoId);
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = `Habitación ${u.numero} - ${tipo?.nombre || 'Sin tipo'}`;
        selectFiltro.appendChild(opt);
      });
      
      // Llenar select del formulario
      await this.cargarHabitacionesEnSelect();
    } catch (error) {
      console.error("Error al cargar habitaciones:", error);
    }
  }

  // === BÚSQUEDA Y FILTRADO ===
  buscarReservas(termino) {
    if (!termino) {
      this.aplicarFiltros();
      return;
    }

    const reservasFiltradas = this.reservasEnMemoria.filter(reserva => 
      reserva.clienteNombre.toLowerCase().includes(termino.toLowerCase()) ||
      reserva.clienteEmail.toLowerCase().includes(termino.toLowerCase()) ||
      reserva.id.toLowerCase().includes(termino.toLowerCase()) ||
      (reserva.clienteDocumento && reserva.clienteDocumento.toLowerCase().includes(termino.toLowerCase()))
    );

    this.renderReservas(reservasFiltradas, `Resultados para: "${termino}"`);
  }

  aplicarFiltros() {
    const estado = document.getElementById('filtro-estado').value;
    const checkin = document.getElementById('filtro-checkin').value;
    const checkout = document.getElementById('filtro-checkout').value;
    const habitacion = document.getElementById('filtro-habitacion').value;

    let reservasFiltradas = this.reservasEnMemoria;

    if (estado) {
      reservasFiltradas = reservasFiltradas.filter(r => r.estado === estado);
    }

    if (checkin) {
      reservasFiltradas = reservasFiltradas.filter(r => r.fechaCheckin >= checkin);
    }

    if (checkout) {
      reservasFiltradas = reservasFiltradas.filter(r => r.fechaCheckout <= checkout);
    }

    if (habitacion) {
      reservasFiltradas = reservasFiltradas.filter(r => r.habitacionId === habitacion);
    }

    this.renderReservas(reservasFiltradas);
  }

  // === RENDERIZADO ===
 renderReservas(reservas, titulo = null) {
  let html = titulo ? `<h3>${titulo}</h3>` : `<h3>Reservas (${reservas.length})</h3>`;
  
  if (reservas.length === 0) {
    html += `<p>No se encontraron reservas.</p>`;
  } else {
    html += `<div class="results-grid">`;
    
    reservas.forEach(reserva => {
      const habitacion = this.habitacionesDisponibles.find(h => h.id === reserva.unidadId);
      const tipo = this.tiposHabitacion.find(t => t.id === habitacion?.tipoId);
      const numeroHabitacion = habitacion ? habitacion.numero : reserva.unidadNumero || 'N/A';
      const nombreTipo = tipo ? tipo.nombre : reserva.habitacionNombre || 'Tipo desconocido';
      
      html += `
        <div class="result-card">
          <h4>
            ${this.escapeHtml(reserva.huespedNombre || reserva.clienteNombre)}
            <span class="reserva-id">${reserva.codigoReserva || `#${reserva.id.slice(-8)}`}</span>
          </h4>
          
          <div class="reserva-info">
            <p><strong>Email:</strong> ${reserva.huespedEmail || reserva.clienteEmail}</p>
            <p><strong>Habitación:</strong> ${numeroHabitacion} (${nombreTipo})</p>
            <p><strong>Check-in:</strong> ${this.formatearFecha(reserva.checkin || reserva.fechaCheckin)}</p>
            <p><strong>Check-out:</strong> ${this.formatearFecha(reserva.checkout || reserva.fechaCheckout)}</p>
            <p><strong>Noches:</strong> ${reserva.noches || 1}</p>
            <p><strong>Total:</strong> S/${reserva.total || '0.00'}</p>
          </div>
          
          <p><strong>Estado:</strong> 
            <span class="estado-badge ${reserva.estado}">${this.formatearEstado(reserva.estado)}</span>
          </p>
          
          <div class="card-actions">
            <button class="btn btn-sm" onclick="window.adminReservas.verDetalles('${reserva.id}')">
              <i class="fas fa-eye"></i> Detalles
            </button>
            <button class="btn btn-sm btn-secondary" onclick="window.adminReservas.editarReserva('${reserva.id}')">
              <i class="fas fa-edit"></i> Editar
            </button>
            ${reserva.estado !== 'cancelada' && reserva.estado !== 'completada' ? `
              <button class="btn btn-sm" style="background:#dc3545;" onclick="window.adminReservas.eliminarReserva('${reserva.id}')">
                <i class="fas fa-trash"></i> Eliminar
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
  }
  
  this.contenedores.resultados.innerHTML = html;
}

  // === MÉTODOS PARA RESERVAS ===
  async editarReserva(id) {
    try {
      const reserva = await ReservaService.obtenerPorId(id);
      if (reserva) {
        this.abrirModalReserva(id, reserva);
      } else {
        alert('❌ Reserva no encontrada');
      }
    } catch (error) {
      console.error("Error al cargar reserva para editar:", error);
      alert('❌ Error al cargar la reserva');
    }
  }

  async eliminarReserva(id) {
    if (!confirm('¿Está seguro de eliminar esta reserva?\nEsta acción no se puede deshacer.')) return;
    
    try {
      await ReservaService.eliminar(id);
      alert('✅ Reserva eliminada correctamente');
      this.cargarYMostrarReservas();
    } catch (error) {
      console.error("Error al eliminar reserva:", error);
      alert('❌ Error al eliminar la reserva');
    }
  }

async cambiarEstadoReserva(id, nuevoEstado) {
  try {
    console.log("🔄 Cambiando estado de reserva:", id, "a:", nuevoEstado);
    
    // Obtener la reserva actual primero para no perder datos
    const reservaActual = await ReservaService.obtenerPorId(id);
    if (!reservaActual) {
      alert('❌ Reserva no encontrada');
      return;
    }

    // Actualizar solo el campo estado, manteniendo todos los demás datos
    const datosActualizados = {
      estado: nuevoEstado,
      // Mantener todos los campos existentes
      ...reservaActual
    };

    await ReservaService.actualizar(id, datosActualizados);
    alert(`✅ Estado de reserva actualizado a: ${this.formatearEstado(nuevoEstado)}`);
    
    // Recargar y cerrar modales
    await this.cargarYMostrarReservas();
    this.cerrarTodosLosModales();
    
  } catch (error) {
    console.error("❌ Error al cambiar estado:", error);
    alert('❌ Error al cambiar el estado de la reserva');
  }
}

  async verDetallesReserva(id) {
    try {
      const reserva = await ReservaService.obtenerPorId(id);
      if (reserva) {
        this.mostrarDetallesReserva(reserva);
      } else {
        alert('❌ Reserva no encontrada');
      }
    } catch (error) {
      console.error("Error al cargar detalles:", error);
      alert('❌ Error al cargar los detalles de la reserva');
    }
  }

  // === MÉTODOS DE FORMULARIO ===
  async abrirModalReserva(id = null, data = null) {
    await this.cargarHabitacionesEnSelect();
    
    if (id && data) {
      document.getElementById('titulo-modal-reserva').textContent = 'Editar Reserva';
      this.llenarFormularioReserva(id, data);
    } else {
      document.getElementById('titulo-modal-reserva').textContent = 'Nueva Reserva';
      this.formularios.reserva.reset();
      document.getElementById('reserva-id').value = '';
      this.contenedores.resumen.innerHTML = '<p>Seleccione una habitación y fechas para ver el resumen</p>';
    }
    this.abrirModal(this.modales.reserva);
  }

  llenarFormularioReserva(id, data) {
    document.getElementById('reserva-id').value = id;
    document.getElementById('reserva-nombre').value = data.clienteNombre;
    document.getElementById('reserva-email').value = data.clienteEmail;
    document.getElementById('reserva-telefono').value = data.clienteTelefono;
    document.getElementById('reserva-documento').value = data.clienteDocumento || '';
    document.getElementById('reserva-habitacionId').value = data.habitacionId;
    document.getElementById('reserva-checkin').value = data.fechaCheckin;
    document.getElementById('reserva-checkout').value = data.fechaCheckout;
    document.getElementById('reserva-huespedes').value = data.numeroHuespedes;
    document.getElementById('reserva-estado').value = data.estado;
    document.getElementById('reserva-notas').value = data.notas || '';
    
    // Calcular resumen
    this.calcularResumen();
  }

  async cargarHabitacionesEnSelect() {
    const select = document.getElementById('reserva-habitacionId');
    if (!select) return;
    
    try {
      const unidades = await UnidadHabitacionService.listarTodas();
      const tipos = await TipoHabitacionService.listar();
      
      select.innerHTML = '<option value="">Seleccione una habitación</option>';
      unidades.forEach(u => {
        const tipo = tipos.find(t => t.id === u.tipoId);
        if (tipo && u.estado === 'disponible') {
          const opt = document.createElement('option');
          opt.value = u.id;
          opt.textContent = `Habitación ${u.numero} - ${tipo.nombre} (S/${tipo.precioPorNoche}/noche)`;
          select.appendChild(opt);
        }
      });
    } catch (error) {
      console.error("Error al cargar habitaciones en select:", error);
      select.innerHTML = '<option value="">Error al cargar habitaciones</option>';
    }
  }

  async calcularResumen() {
    const habitacionId = document.getElementById('reserva-habitacionId').value;
    const checkin = document.getElementById('reserva-checkin').value;
    const checkout = document.getElementById('reserva-checkout').value;
    
    if (!habitacionId || !checkin || !checkout) {
      this.contenedores.resumen.innerHTML = '<p>Seleccione una habitación y fechas para ver el resumen</p>';
      return;
    }
    
    try {
      const habitacion = this.habitacionesDisponibles.find(h => h.id === habitacionId);
      const tipo = this.tiposHabitacion.find(t => t.id === habitacion?.tipoId);
      
      if (!tipo) {
        this.contenedores.resumen.innerHTML = '<p class="error">Error: No se pudo encontrar información de la habitación</p>';
        return;
      }
      
      // Calcular número de noches
      const fechaInicio = new Date(checkin);
      const fechaFin = new Date(checkout);
      const diffTime = Math.abs(fechaFin - fechaInicio);
      const noches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (noches <= 0) {
        this.contenedores.resumen.innerHTML = '<p class="error">La fecha de check-out debe ser posterior al check-in</p>';
        return;
      }
      
      const subtotal = tipo.precioPorNoche * noches;
      const igv = subtotal * 0.18; // 18% IGV
      const total = subtotal + igv;
      
      this.contenedores.resumen.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <p><strong>Habitación:</strong> ${tipo.nombre}</p>
            <p><strong>Noches:</strong> ${noches}</p>
            <p><strong>Precio por noche:</strong> S/${tipo.precioPorNoche}</p>
          </div>
          <div>
            <p><strong>Subtotal:</strong> S/${subtotal.toFixed(2)}</p>
            <p><strong>IGV (18%):</strong> S/${igv.toFixed(2)}</p>
            <p><strong>Total:</strong> S/${total.toFixed(2)}</p>
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Error al calcular resumen:", error);
      this.contenedores.resumen.innerHTML = '<p class="error">Error al calcular el resumen</p>';
    }
  }

  async guardarReserva(e) {
    e.preventDefault();
    
    const id = document.getElementById('reserva-id').value;
    const data = {
      clienteNombre: document.getElementById('reserva-nombre').value.trim(),
      clienteEmail: document.getElementById('reserva-email').value.trim(),
      clienteTelefono: document.getElementById('reserva-telefono').value.trim(),
      clienteDocumento: document.getElementById('reserva-documento').value.trim(),
      habitacionId: document.getElementById('reserva-habitacionId').value,
      fechaCheckin: document.getElementById('reserva-checkin').value,
      fechaCheckout: document.getElementById('reserva-checkout').value,
      numeroHuespedes: parseInt(document.getElementById('reserva-huespedes').value),
      estado: document.getElementById('reserva-estado').value,
      notas: document.getElementById('reserva-notas').value.trim()
    };

    // Validaciones
    const errores = this.validarReserva(data);
    if (errores.length > 0) {
      alert('Errores de validación:\n• ' + errores.join('\n• '));
      return;
    }

    try {
      if (id) {
        await ReservaService.actualizar(id, data);
        alert('✅ Reserva actualizada correctamente');
      } else {
        // Calcular total para nueva reserva
        const habitacion = this.habitacionesDisponibles.find(h => h.id === data.habitacionId);
        const tipo = this.tiposHabitacion.find(t => t.id === habitacion?.tipoId);
        
        if (tipo) {
          const fechaInicio = new Date(data.fechaCheckin);
          const fechaFin = new Date(data.fechaCheckout);
          const diffTime = Math.abs(fechaFin - fechaInicio);
          const noches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const subtotal = tipo.precioPorNoche * noches;
          data.total = subtotal + (subtotal * 0.18); // + IGV
        }
        
        await ReservaService.crear(data);
        alert('✅ Reserva creada correctamente');
      }
      this.cerrarTodosLosModales();
      this.cargarYMostrarReservas();
    } catch (error) {
      console.error("Error al guardar reserva:", error);
      alert('❌ Error al guardar la reserva');
    }
  }

  validarReserva(data) {
    const errores = [];
    
    if (!data.clienteNombre) errores.push('El nombre del cliente es requerido');
    if (!data.clienteEmail) errores.push('El email del cliente es requerido');
    if (!data.clienteTelefono) errores.push('El teléfono del cliente es requerido');
    if (!data.habitacionId) errores.push('Debe seleccionar una habitación');
    if (!data.fechaCheckin) errores.push('La fecha de check-in es requerida');
    if (!data.fechaCheckout) errores.push('La fecha de check-out es requerida');
    if (data.numeroHuespedes <= 0) errores.push('El número de huéspedes debe ser mayor a 0');
    
    // Validar fechas
    if (data.fechaCheckin && data.fechaCheckout) {
      const checkin = new Date(data.fechaCheckin);
      const checkout = new Date(data.fechaCheckout);
      
      if (checkout <= checkin) {
        errores.push('La fecha de check-out debe ser posterior al check-in');
      }
      
      // No permitir reservas en el pasado
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (checkin < hoy) {
        errores.push('No se pueden hacer reservas con fechas en el pasado');
      }
    }
    
    return errores;
  }

  // === DETALLES DE RESERVA ===
  async mostrarDetallesReserva(reserva) {
    const habitacion = this.habitacionesDisponibles.find(h => h.id === reserva.habitacionId);
    const tipo = this.tiposHabitacion.find(t => t.id === habitacion?.tipoId);
    
    let html = `
      <div class="reserva-info" style="grid-template-columns: 1fr; gap: 15px;">
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
          <h3 style="margin-bottom: 10px; color: var(--primary);">Información del Cliente</h3>
          <p><strong>Nombre:</strong> ${reserva.clienteNombre}</p>
          <p><strong>Email:</strong> ${reserva.clienteEmail}</p>
          <p><strong>Teléfono:</strong> ${reserva.clienteTelefono}</p>
          ${reserva.clienteDocumento ? `<p><strong>Documento:</strong> ${reserva.clienteDocumento}</p>` : ''}
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
          <h3 style="margin-bottom: 10px; color: var(--primary);">Detalles de la Reserva</h3>
          <p><strong>Habitación:</strong> ${habitacion ? `Habitación ${habitacion.numero}` : 'N/A'} ${tipo ? `(${tipo.nombre})` : ''}</p>
          <p><strong>Check-in:</strong> ${this.formatearFecha(reserva.fechaCheckin)}</p>
          <p><strong>Check-out:</strong> ${this.formatearFecha(reserva.fechaCheckout)}</p>
          <p><strong>Noches:</strong> ${this.calcularNoches(reserva.fechaCheckin, reserva.fechaCheckout)}</p>
          <p><strong>Huéspedes:</strong> ${reserva.numeroHuespedes}</p>
          <p><strong>Estado:</strong> <span class="estado-badge ${reserva.estado}">${this.formatearEstado(reserva.estado)}</span></p>
          ${reserva.total ? `<p><strong>Total:</strong> S/${reserva.total}</p>` : ''}
        </div>
        
        ${reserva.notas ? `
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <h3 style="margin-bottom: 10px; color: var(--primary);">Notas Adicionales</h3>
            <p>${reserva.notas}</p>
          </div>
        ` : ''}
      </div>
      
      <div class="card-actions" style="margin-top: 20px; justify-content: center;">
        <button class="btn btn-secondary" onclick="window.adminReservas.abrirEdicionDesdeDetalles('${reserva.id}')">
          <i class="fas fa-edit"></i> Editar Reserva
        </button>
    `;
    
    // Botones para cambiar estado (según estado actual)
    if (reserva.estado === 'pendiente') {
      html += `
        <button class="btn" onclick="window.adminReservas.cambiarEstado('${reserva.id}', 'confirmada')">
          <i class="fas fa-check"></i> Confirmar
        </button>
        <button class="btn" style="background:#dc3545;" onclick="window.adminReservas.cambiarEstado('${reserva.id}', 'cancelada')">
          <i class="fas fa-times"></i> Cancelar
        </button>
      `;
    } else if (reserva.estado === 'confirmada') {
      html += `
        <button class="btn" onclick="window.adminReservas.cambiarEstado('${reserva.id}', 'activa')">
          <i class="fas fa-play"></i> Marcar como Activa
        </button>
        <button class="btn" style="background:#dc3545;" onclick="window.adminReservas.cambiarEstado('${reserva.id}', 'cancelada')">
          <i class="fas fa-times"></i> Cancelar
        </button>
      `;
    } else if (reserva.estado === 'activa') {
      html += `
        <button class="btn" onclick="window.adminReservas.cambiarEstado('${reserva.id}', 'completada')">
          <i class="fas fa-flag-checkered"></i> Completar
        </button>
      `;
    }
    
    html += `</div>`;
    
    this.contenedores.detalles.innerHTML = html;
    this.abrirModal(this.modales.detalles);
  }

  // === MÉTODOS AUXILIARES ===
abrirModal(modal) {
  // Cerrar todos los modales primero para evitar superposiciones
  this.cerrarTodosLosModales();
  
  modal.style.display = 'flex';
  modal.style.zIndex = '1000';
  document.body.style.overflow = 'hidden';
  
  // Asegurar que esté al frente
  setTimeout(() => {
    modal.style.opacity = '1';
  }, 10);
}
cerrarModal(modal) {
  modal.style.display = 'none';
  modal.style.zIndex = '0';
}

cerrarTodosLosModales() {
  Object.values(this.modales).forEach(m => {
    m.style.display = 'none';
    m.style.zIndex = '0';
  });
  document.body.style.overflow = 'auto';
}

  formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
async abrirEdicionDesdeDetalles(id) {
  try {
    // 1. Cerrar modal de detalles
    this.cerrarModal(this.modales.detalles);
    
    // 2. Pequeña pausa para asegurar el cierre
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 3. Abrir modal de edición
    const reserva = await ReservaService.obtenerPorId(id);
    if (reserva) {
      this.abrirModalReserva(id, reserva);
    }
  } catch (error) {
    console.error("Error al abrir edición:", error);
    alert('❌ Error al cargar la reserva para editar');
  }
}
  formatearEstado(estado) {
    const estados = {
      'pendiente': 'Pendiente',
      'confirmada': 'Confirmada',
      'activa': 'Activa',
      'completada': 'Completada',
      'cancelada': 'Cancelada'
    };
    return estados[estado] || estado;
  }

  calcularNoches(checkin, checkout) {
    const fechaInicio = new Date(checkin);
    const fechaFin = new Date(checkout);
    const diffTime = Math.abs(fechaFin - fechaInicio);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('resultados-container')) {
    new AdminReservas();
  }
});