// js/admin/adminHabitaciones.js
import { TipoHabitacionService } from '../firebase/services/tipoHabitacionService.js';
import { UnidadHabitacionService } from '../firebase/services/unidadHabitacionService.js';

class AdminHabitaciones {
  constructor() {
    this.modales = {
      tipo: document.getElementById('modal-tipo'),
      unidad: document.getElementById('modal-unidad'),
      unidadesTipo: document.getElementById('modal-unidades-tipo')
    };
    this.botones = {
      agregarTipo: document.getElementById('btn-agregar-tipo'),
      agregarUnidad: document.getElementById('btn-agregar-unidad')
    };
    this.formularios = {
      tipo: document.getElementById('form-tipo'),
      unidad: document.getElementById('form-unidad')
    };
    this.contenedores = {
      resultados: document.getElementById('resultados-container'),
      unidadesLista: document.getElementById('lista-unidades-tipo')
    };

    this.tiposEnMemoria = [];
    this.unidadesEnMemoria = new Map();

    this.init();
  }

  init() {
    this.bindEvents();
    this.cargarYMostrarTipos();

    // Exponer métodos globalmente - CORREGIDO
    window.admin = {
      verUnidadesDeTipo: (tipoId) => this.verUnidadesDeTipo(tipoId),
      editarTipo: (id) => this.editarTipo(id),
      eliminarTipo: (id) => this.eliminarTipo(id),
      editarUnidad: (id, tipoId) => this.editarUnidad(id, tipoId),
      eliminarUnidad: (id, tipoId) => this.eliminarUnidad(id, tipoId)
    };
  }

  bindEvents() {
    this.botones.agregarTipo?.addEventListener('click', () => this.abrirModalTipo());
    this.botones.agregarUnidad?.addEventListener('click', () => this.abrirModalUnidad());
    this.formularios.tipo?.addEventListener('submit', (e) => this.guardarTipo(e));
    this.formularios.unidad?.addEventListener('submit', (e) => this.guardarUnidad(e));

    // Búsqueda en tiempo real
    document.getElementById('busqueda-habitaciones')?.addEventListener('input', (e) => {
      this.buscarHabitaciones(e.target.value);
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => this.cerrarTodosLosModales());
    });
    
    Object.values(this.modales).forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.cerrarTodosLosModales();
      });
    });
  }

  // === BÚSQUEDA ===
  async buscarHabitaciones(termino) {
    if (!termino) {
      this.cargarYMostrarTipos();
      return;
    }

    try {
      // Buscar en tipos
      const tipos = this.tiposEnMemoria.filter(tipo => 
        tipo.nombre.toLowerCase().includes(termino.toLowerCase()) ||
        tipo.tipo.toLowerCase().includes(termino.toLowerCase()) ||
        tipo.descripcion.toLowerCase().includes(termino.toLowerCase())
      );

      // Buscar en unidades
      const todasUnidades = [];
      for (const tipo of this.tiposEnMemoria) {
        const unidades = await UnidadHabitacionService.listarPorTipo(tipo.id);
        const unidadesFiltradas = unidades.filter(unidad => 
          unidad.numero.toString().includes(termino) ||
          unidad.piso.toString().includes(termino) ||
          unidad.estado.toLowerCase().includes(termino.toLowerCase())
        );
        todasUnidades.push(...unidadesFiltradas.map(u => ({...u, tipoNombre: tipo.nombre, tipoId: tipo.id})));
      }

      this.mostrarResultadosBusqueda(tipos, todasUnidades, termino);
    } catch (error) {
      console.error("Error en búsqueda:", error);
      this.contenedores.resultados.innerHTML = '<p class="error">❌ Error al realizar la búsqueda</p>';
    }
  }

  mostrarResultadosBusqueda(tipos, unidades, termino) {
    let html = `<h3>Resultados para: "${termino}"</h3>`;
    
    if (tipos.length === 0 && unidades.length === 0) {
      html += `<p>No se encontraron resultados.</p>`;
    } else {
      html += `<div class="results-grid">`;
      
      // Mostrar tipos encontrados
      tipos.forEach(t => {
        const imagen = t.imagen || 'https://via.placeholder.com/300x200?text=Sin+imagen';
        html += `
          <div class="result-card">
            <div class="room-image" style="height: 150px; overflow: hidden; border-radius: 8px;">
              <img src="${imagen}" alt="${this.escapeHtml(t.nombre)}" 
                   style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <h4>TIPO: ${this.escapeHtml(t.nombre)}</h4>
            <p><strong>Categoría:</strong> ${t.tipo}</p>
            <p><strong>Precio:</strong> S/${t.precioPorNoche}</p>
            <p><strong>Capacidad:</strong> ${t.capacidad} personas</p>
            <p><strong>Vista:</strong> ${t.vista}</p>
            <div class="card-actions">
              <button class="btn btn-sm" onclick="window.admin.verUnidadesDeTipo('${t.id}')">
                <i class="fas fa-eye"></i> Ver Unidades
              </button>
              <button class="btn btn-sm btn-secondary" onclick="window.admin.editarTipo('${t.id}')">
                <i class="fas fa-edit"></i> Editar
              </button>
              <button class="btn btn-sm" style="background:#dc3545;" onclick="window.admin.eliminarTipo('${t.id}')">
                <i class="fas fa-trash"></i> Eliminar
              </button>
            </div>
          </div>
        `;
      });

      // Mostrar unidades encontradas - CORREGIDO
      unidades.forEach(u => {
        html += `
          <div class="result-card">
            <h4>UNIDAD: Habitación #${u.numero}</h4>
            <p><strong>Tipo:</strong> ${u.tipoNombre}</p>
            <p><strong>Piso:</strong> ${u.piso}</p>
            <p><strong>Estado:</strong> 
              <span class="estado-badge ${u.estado}">${u.estado}</span>
            </p>
            <div class="card-actions">
              <button class="btn btn-sm btn-secondary" onclick="window.admin.editarUnidad('${u.id}', '${u.tipoId}')">
                <i class="fas fa-edit"></i> Editar
              </button>
              <button class="btn btn-sm" style="background:#dc3545;" onclick="window.admin.eliminarUnidad('${u.id}', '${u.tipoId}')">
                <i class="fas fa-trash"></i> Eliminar
              </button>
            </div>
          </div>
        `;
      });
      
      html += `</div>`;
    }
    
    this.contenedores.resultados.innerHTML = html;
  }

  // === MÉTODOS PARA TIPOS ===
  async editarTipo(id) {
    try {
      const tipo = await this.obtenerTipoPorId(id);
      if (tipo) {
        this.abrirModalTipo(id, tipo);
      } else {
        alert('❌ Tipo de habitación no encontrado');
      }
    } catch (error) {
      console.error("Error al cargar tipo para editar:", error);
      alert('❌ Error al cargar el tipo de habitación');
    }
  }

  async eliminarTipo(id) {
    if (!confirm('¿Está seguro de eliminar este tipo de habitación?\n\nNOTA: Las unidades existentes NO se eliminarán, pero quedarán sin tipo asignado.')) return;
    
    try {
      // Verificar si hay unidades asociadas
      const unidades = await UnidadHabitacionService.listarPorTipo(id);
      if (unidades.length > 0) {
        if (!confirm(`ADVERTENCIA: Este tipo tiene ${unidades.length} unidad(es) asociada(s).\n\nLas unidades no se eliminarán, pero perderán la referencia a este tipo.\n¿Continuar con la eliminación?`)) {
          return;
        }
      }
      
      await TipoHabitacionService.eliminar(id);
      alert('✅ Tipo eliminado correctamente');
      this.cargarYMostrarTipos();
    } catch (error) {
      console.error("Error al eliminar tipo:", error);
      alert('❌ Error al eliminar el tipo de habitación');
    }
  }

  async verUnidadesDeTipo(tipoId) {
    try {
      const tipo = await this.obtenerTipoPorId(tipoId);
      const nombre = tipo ? tipo.nombre : 'Tipo de habitación';
      await this._mostrarUnidadesDeTipo(tipoId, nombre);
    } catch (error) {
      console.error("Error al ver unidades:", error);
      alert('❌ Error al cargar las unidades');
    }
  }

  // === MÉTODOS PARA UNIDADES - CORREGIDOS ===
  async editarUnidad(id, tipoId) {
    try {
      console.log("Editando unidad:", id, "tipoId:", tipoId);
      
      // CERRAR el modal de unidades antes de abrir el de editar
      this.cerrarModal(this.modales.unidadesTipo);
      
      const unidades = await UnidadHabitacionService.listarPorTipo(tipoId);
      const unidad = unidades.find(u => u.id === id);
      
      if (unidad) {
        console.log("Unidad encontrada:", unidad);
        await this.abrirModalUnidad(id, unidad);
      } else {
        console.error("Unidad no encontrada");
        alert('❌ Unidad no encontrada');
        // Reabrir el modal de unidades si no se encontró la unidad
        await this._mostrarUnidadesDeTipo(tipoId, document.getElementById('nombre-tipo').textContent);
      }
    } catch (error) {
      console.error("Error al cargar unidad para editar:", error);
      alert('❌ Error al cargar la unidad');
    }
  }

  async eliminarUnidad(id, tipoId) {
    if (!confirm('¿Está seguro de eliminar esta unidad de habitación?\nEsta acción no se puede deshacer.')) return;
    
    try {
      await UnidadHabitacionService.eliminar(id);
      alert('✅ Unidad eliminada correctamente');
      
      // Actualizar la vista actual
      const modalUnidades = document.getElementById('modal-unidades-tipo');
      if (modalUnidades.style.display === 'flex') {
        const nombreTipo = document.getElementById('nombre-tipo').textContent;
        await this._mostrarUnidadesDeTipo(tipoId, nombreTipo);
      } else {
        this.cargarYMostrarTipos();
      }
    } catch (error) {
      console.error("Error al eliminar unidad:", error);
      alert('❌ Error al eliminar la unidad');
    }
  }

  // === MÉTODOS PRIVADOS ===
  async obtenerTipoPorId(id) {
    let tipo = this.tiposEnMemoria.find(t => t.id === id);
    if (!tipo) {
      const tipos = await TipoHabitacionService.listar();
      tipo = tipos.find(t => t.id === id);
    }
    return tipo;
  }

  async _mostrarUnidadesDeTipo(tipoId, nombre) {
    document.getElementById('nombre-tipo').textContent = nombre;
    this.abrirModal(this.modales.unidadesTipo);
    
    try {
      const unidades = await UnidadHabitacionService.listarPorTipo(tipoId);
      this.renderUnidades(unidades, tipoId);
    } catch (error) {
      console.error("Error al cargar unidades:", error);
      this.contenedores.unidadesLista.innerHTML = '<p class="error">❌ Error al cargar las unidades</p>';
    }
  }

  renderUnidades(unidades, tipoId) {
    let html = '';
    
    if (unidades.length === 0) {
      html = `<p>No hay unidades registradas para este tipo de habitación.</p>`;
    } else {
      const disponibles = unidades.filter(u => u.estado === 'disponible').length;
      const mantenimiento = unidades.filter(u => u.estado === 'mantenimiento').length;
      
      html = `
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
          <strong>Resumen de unidades:</strong>
          <div style="display: flex; gap: 15px; margin-top: 8px;">
            <span>Total: <strong>${unidades.length}</strong></span>
            <span style="color: #28a745;">Disponibles: <strong>${disponibles}</strong></span>
            <span style="color: #dc3545;">Mantenimiento: <strong>${mantenimiento}</strong></span>
          </div>
        </div>
        <div class="results-grid">
      `;
      
      unidades.forEach(u => {
        const estadoClass = u.estado === 'disponible' ? 'disponible' : 'mantenimiento';
        html += `
          <div class="result-card">
            <h4>Habitación #${u.numero}</h4>
            <p><strong>Piso:</strong> ${u.piso}</p>
            <p><strong>Estado:</strong> 
              <span class="estado-badge ${estadoClass}">${u.estado}</span>
            </p>
            <div class="card-actions">
              <button class="btn btn-sm btn-secondary" onclick="window.admin.editarUnidad('${u.id}', '${tipoId}')">
                <i class="fas fa-edit"></i> Editar
              </button>
              <button class="btn btn-sm" style="background:#dc3545;" onclick="window.admin.eliminarUnidad('${u.id}', '${tipoId}')">
                <i class="fas fa-trash"></i> Eliminar
              </button>
            </div>
          </div>
        `;
      });
      
      html += `</div>`;
    }
    
    this.contenedores.unidadesLista.innerHTML = html;
  }

  abrirModal(modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
    cerrarModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  cerrarTodosLosModales() {
    Object.values(this.modales).forEach(m => m.style.display = 'none');
    document.body.style.overflow = 'auto';
    this.formularios.tipo?.reset();
    this.formularios.unidad?.reset();
    document.getElementById('tipo-id').value = '';
    document.getElementById('unidad-id').value = '';
    document.getElementById('preview-imagen-tipo').style.display = 'none';
  }

  abrirModalTipo(id = null, data = null) {
    const form = this.formularios.tipo;
    if (id && data) {
      document.getElementById('titulo-modal-tipo').textContent = 'Editar Tipo de Habitación';
      form.querySelector('#tipo-id').value = id;
      form.querySelector('#tipo-nombre').value = data.nombre;
      form.querySelector('#tipo-tipo').value = data.tipo;
      form.querySelector('#tipo-precio').value = data.precioPorNoche;
      form.querySelector('#tipo-capacidad').value = data.capacidad;
      form.querySelector('#tipo-vista').value = data.vista;
      form.querySelector('#tipo-desayuno').value = data.incluyeDesayuno ? 'true' : 'false';
      form.querySelector('#tipo-descripcion').value = data.descripcion;
      form.querySelector('#tipo-imagen').value = data.imagen || '';
      
      // Mostrar preview de imagen si existe
      const preview = document.getElementById('preview-imagen-tipo');
      if (data.imagen) {
        preview.src = data.imagen;
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
      }
    } else {
      document.getElementById('titulo-modal-tipo').textContent = 'Agregar Tipo de Habitación';
      form.reset();
      form.querySelector('#tipo-id').value = '';
      document.getElementById('preview-imagen-tipo').style.display = 'none';
    }
    this.abrirModal(this.modales.tipo);
  }

  async abrirModalUnidad(id = null, data = null) {
    console.log("Abriendo modal unidad:", id, data); // Debug
    
    const form = this.formularios.unidad;
    await this.cargarTiposEnSelect();
    
    if (id && data) {
      document.getElementById('titulo-modal-unidad').textContent = 'Editar Unidad de Habitación';
      form.querySelector('#unidad-id').value = id;
      form.querySelector('#unidad-numero').value = data.numero;
      form.querySelector('#unidad-piso').value = data.piso;
      form.querySelector('#unidad-estado').value = data.estado;
      form.querySelector('#unidad-tipoId').value = data.tipoId;
    } else {
      document.getElementById('titulo-modal-unidad').textContent = 'Agregar Unidad de Habitación';
      form.reset();
      form.querySelector('#unidad-id').value = '';
    }
    this.abrirModal(this.modales.unidad);
  }

  async cargarTiposEnSelect() {
    const select = document.getElementById('unidad-tipoId');
    if (!select) return;
    
    try {
      const tipos = await TipoHabitacionService.listar();
      select.innerHTML = '<option value="">Seleccione un tipo</option>';
      tipos.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.nombre;
        select.appendChild(opt);
      });
    } catch (error) {
      console.error("Error al cargar tipos en select:", error);
      select.innerHTML = '<option value="">Error al cargar tipos</option>';
    }
  }

  async cargarYMostrarTipos() {
    try {
      this.contenedores.resultados.innerHTML = '<p>Cargando tipos de habitación...</p>';
      const tipos = await TipoHabitacionService.listar();
      this.tiposEnMemoria = tipos;
      this.renderTipos(tipos);
    } catch (error) {
      console.error("Error al cargar tipos:", error);
      this.contenedores.resultados.innerHTML = '<p class="error">❌ Error al cargar los tipos de habitación</p>';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  renderTipos(tipos) {
    let html = `<h3>Tipos de Habitación (${tipos.length})</h3><div class="results-grid">`;
    
    if (tipos.length === 0) {
      html += `<p>No hay tipos de habitación registrados.</p>`;
    } else {
      tipos.forEach(t => {
        const imagen = t.imagen || 'https://via.placeholder.com/300x200?text=Sin+imagen';
        const desayuno = t.incluyeDesayuno ? 'Sí' : 'No';
        
        html += `
          <div class="result-card">
            <div class="room-image" style="height: 150px; overflow: hidden; border-radius: 8px;">
              <img src="${imagen}" 
                   alt="${this.escapeHtml(t.nombre)}" 
                   style="width: 100%; height: 100%; object-fit: cover;"
                   onerror="this.src='https://via.placeholder.com/300x200?text=Error+imagen'">
            </div>
            <h4>${this.escapeHtml(t.nombre)}</h4>
            <p><strong>Categoría:</strong> ${t.tipo}</p>
            <p><strong>Precio:</strong> S/${t.precioPorNoche}</p>
            <p><strong>Capacidad:</strong> ${t.capacidad} personas</p>
            <p><strong>Vista:</strong> ${t.vista}</p>
            <p><strong>Desayuno:</strong> ${desayuno}</p>
            <div class="card-actions">
              <button class="btn btn-sm" onclick="window.admin.verUnidadesDeTipo('${t.id}')">
                <i class="fas fa-eye"></i> Ver Unidades
              </button>
              <button class="btn btn-sm btn-secondary" onclick="window.admin.editarTipo('${t.id}')">
                <i class="fas fa-edit"></i> Editar
              </button>
              <button class="btn btn-sm" style="background:#dc3545;" onclick="window.admin.eliminarTipo('${t.id}')">
                <i class="fas fa-trash"></i> Eliminar
              </button>
            </div>
          </div>
        `;
      });
    }
    html += `</div>`;
    this.contenedores.resultados.innerHTML = html;
  }

  async guardarTipo(e) {
    e.preventDefault();
    
    const id = document.getElementById('tipo-id').value;
    const data = {
      nombre: document.getElementById('tipo-nombre').value.trim(),
      tipo: document.getElementById('tipo-tipo').value.trim(),
      precioPorNoche: parseFloat(document.getElementById('tipo-precio').value),
      capacidad: parseInt(document.getElementById('tipo-capacidad').value),
      vista: document.getElementById('tipo-vista').value,
      incluyeDesayuno: document.getElementById('tipo-desayuno').value === 'true',
      descripcion: document.getElementById('tipo-descripcion').value.trim(),
      imagen: document.getElementById('tipo-imagen').value.trim() || ''
    };

    // Validaciones básicas
    if (!data.nombre || !data.tipo || data.precioPorNoche <= 0 || data.capacidad <= 0) {
      alert('Por favor complete todos los campos correctamente');
      return;
    }

    try {
      if (id) {
        await TipoHabitacionService.actualizar(id, data);
        alert('✅ Tipo actualizado correctamente');
      } else {
        await TipoHabitacionService.crear(data);
        alert('✅ Tipo creado correctamente');
      }
      this.cerrarTodosLosModales();
      this.cargarYMostrarTipos();
    } catch (error) {
      console.error("Error al guardar tipo:", error);
      alert('❌ Error al guardar el tipo de habitación');
    }
  }

  async guardarUnidad(e) {
    e.preventDefault();
    
    const id = document.getElementById('unidad-id').value;
    const data = {
      numero: parseInt(document.getElementById('unidad-numero').value),
      tipoId: document.getElementById('unidad-tipoId').value,
      piso: parseInt(document.getElementById('unidad-piso').value),
      estado: document.getElementById('unidad-estado').value
    };

    if (!data.tipoId) {
      alert('Por favor seleccione un tipo de habitación.');
      return;
    }

    if (data.numero <= 0 || data.piso <= 0) {
      alert('El número y piso deben ser valores positivos.');
      return;
    }

    try {
      if (id) {
        await UnidadHabitacionService.actualizar(id, data);
        alert('✅ Unidad actualizada correctamente');
      } else {
        await UnidadHabitacionService.crear(data);
        alert('✅ Unidad creada correctamente');
      }
      this.cerrarTodosLosModales();
      this.cargarYMostrarTipos();
    } catch (error) {
      console.error("Error al guardar unidad:", error);
      alert('❌ Error al guardar la unidad');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('resultados-container')) {
    new AdminHabitaciones();
  }
});