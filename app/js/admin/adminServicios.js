import { CategoriaService } from '../firebase/services/categoriaService.js';
import { ServicioService } from '../firebase/services/servicioService.js';

class AdminServicios {
  constructor() {
    this.modales = {
      categoria: document.getElementById('modal-categoria'),
      servicio: document.getElementById('modal-servicio')
    };
    this.botones = {
      agregarCategoria: document.getElementById('btn-agregar-categoria'),
      agregarServicio: document.getElementById('btn-agregar-servicio')
    };
    this.formularios = {
      categoria: document.getElementById('form-categoria'),
      servicio: document.getElementById('form-servicio')
    };
    this.contenedores = {
      resultados: document.getElementById('resultados-container'),
      filtros: document.getElementById('filtros-categorias')
    };

    this.categoriasEnMemoria = [];
    this.serviciosEnMemoria = [];
    this.categoriaFiltroActual = 'todas';

    this.init();
  }

  init() {
    this.bindEvents();
    this.cargarDatosIniciales();

    window.adminServicios = {
      editarCategoria: (id) => this.editarCategoria(id),
      eliminarCategoria: (id) => this.eliminarCategoria(id),
      editarServicio: (id) => this.editarServicio(id),
      eliminarServicio: (id) => this.eliminarServicio(id)
    };
  }

  bindEvents() {
    this.botones.agregarCategoria?.addEventListener('click', () => this.abrirModalCategoria());
    this.botones.agregarServicio?.addEventListener('click', () => this.abrirModalServicio());
    this.formularios.categoria?.addEventListener('submit', (e) => this.guardarCategoria(e));
    this.formularios.servicio?.addEventListener('submit', (e) => this.guardarServicio(e));

    // Búsqueda en tiempo real
    document.getElementById('busqueda-servicios')?.addEventListener('input', (e) => {
      this.buscarServicios(e.target.value);
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

  async cargarDatosIniciales() {
    try {
      const [categorias, servicios] = await Promise.all([
        CategoriaService.listar(),
        ServicioService.listar()
      ]);

      this.categoriasEnMemoria = categorias.filter(c => c.estado === 'activo');
      this.serviciosEnMemoria = servicios;

      this.renderFiltrosCategorias();
      this.renderServicios(servicios);
    } catch (error) {
      console.error("Error al cargar datos iniciales:", error);
      this.contenedores.resultados.innerHTML = '<p class="error">❌ Error al cargar los servicios</p>';
    }
  }

  renderFiltrosCategorias() {
    let html = `
      <div class="filtro-categoria active" data-categoria="todas">Todos los Servicios</div>
      <div class="filtro-categoria" data-categoria="destacados">Servicios Destacados</div>
    `;

    this.categoriasEnMemoria.forEach(categoria => {
      html += `<div class="filtro-categoria" data-categoria="${categoria.id}">${categoria.nombre}</div>`;
    });

    this.contenedores.filtros.innerHTML = html;

    // Agregar event listeners a los filtros
    this.contenedores.filtros.querySelectorAll('.filtro-categoria').forEach(filtro => {
      filtro.addEventListener('click', () => {
        const categoriaId = filtro.getAttribute('data-categoria');
        this.aplicarFiltroCategoria(categoriaId);
      });
    });
  }

  aplicarFiltroCategoria(categoriaId) {
    // Actualizar UI de filtros
    this.contenedores.filtros.querySelectorAll('.filtro-categoria').forEach(f => {
      f.classList.remove('active');
    });
    this.contenedores.filtros.querySelector(`[data-categoria="${categoriaId}"]`).classList.add('active');

    this.categoriaFiltroActual = categoriaId;

    let serviciosFiltrados = this.serviciosEnMemoria;

    if (categoriaId === 'destacados') {
      serviciosFiltrados = serviciosFiltrados.filter(s => s.destacado === true && s.estado === 'activo');
    } else if (categoriaId !== 'todas') {
      serviciosFiltrados = serviciosFiltrados.filter(s => s.categoriaId === categoriaId);
    }

    this.renderServicios(serviciosFiltrados);
  }

  buscarServicios(termino) {
    if (!termino) {
      this.aplicarFiltroCategoria(this.categoriaFiltroActual);
      return;
    }

    const serviciosFiltrados = this.serviciosEnMemoria.filter(servicio =>
      servicio.nombre.toLowerCase().includes(termino.toLowerCase()) ||
      servicio.descripcion.toLowerCase().includes(termino.toLowerCase())
    );

    this.renderServicios(serviciosFiltrados, termino);
  }

  renderServicios(servicios, terminoBusqueda = '') {
    let html = '';

    if (terminoBusqueda) {
      html += `<h3>Resultados para: "${terminoBusqueda}" (${servicios.length})</h3>`;
    } else {
      const titulo = this.categoriaFiltroActual === 'todas' ? 
        'Todos los Servicios' : 
        this.categoriaFiltroActual === 'destacados' ?
        'Servicios Destacados' :
        this.categoriasEnMemoria.find(c => c.id === this.categoriaFiltroActual)?.nombre || 'Servicios';
      
      html += `<h3>${titulo} (${servicios.length})</h3>`;
    }

    if (servicios.length === 0) {
      html += `<p>No se encontraron servicios.</p>`;
    } else {
      html += `<div class="results-grid">`;
      
      servicios.forEach(servicio => {
        const categoria = this.categoriasEnMemoria.find(c => c.id === servicio.categoriaId);
        const imagen = servicio.imagen || 'https://via.placeholder.com/400x300?text=Servicio';
        
        html += `
          <div class="service-card ${servicio.destacado ? 'destacado' : ''}">
            <div class="service-image">
              <img src="${imagen}" alt="${this.escapeHtml(servicio.nombre)}"
                   onerror="this.src='https://via.placeholder.com/400x300?text=Error+imagen'">
            </div>
            <div class="service-categoria">${categoria?.nombre || 'Sin categoría'}</div>
            <h4>
              ${this.escapeHtml(servicio.nombre)}
              ${servicio.destacado ? '<span class="badge-destacado">DESTACADO</span>' : ''}
            </h4>
            <div class="service-precio">S/ ${servicio.precio.toFixed(2)}</div>
            <div class="service-descripcion">${this.escapeHtml(servicio.descripcion)}</div>
            <div class="service-info">
              ${servicio.duracion ? `<span><i class="fas fa-clock"></i> ${servicio.duracion}</span>` : ''}
              ${servicio.horario ? `<span><i class="fas fa-calendar"></i> ${servicio.horario}</span>` : ''}
            </div>
            <div class="service-info">
              <span class="estado-badge ${servicio.estado === 'activo' ? 'estado-activo' : 'estado-inactivo'}">
                ${servicio.estado}
              </span>
            </div>
            <div class="card-actions">
              <button class="btn btn-sm btn-secondary" onclick="window.adminServicios.editarServicio('${servicio.id}')">
                <i class="fas fa-edit"></i> Editar
              </button>
              <button class="btn btn-sm" style="background:#dc3545;" onclick="window.adminServicios.eliminarServicio('${servicio.id}')">
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

  // Métodos para Categorías
  async editarCategoria(id) {
    try {
      const categoria = this.categoriasEnMemoria.find(c => c.id === id);
      if (categoria) {
        this.abrirModalCategoria(id, categoria);
      }
    } catch (error) {
      console.error("Error al editar categoría:", error);
      alert('❌ Error al cargar la categoría');
    }
  }

  async eliminarCategoria(id) {
    // Verificar si hay servicios usando esta categoría
    const serviciosEnCategoria = this.serviciosEnMemoria.filter(s => s.categoriaId === id);
    
    if (serviciosEnCategoria.length > 0) {
      alert(`No se puede eliminar la categoría porque tiene ${serviciosEnCategoria.length} servicio(s) asociado(s).`);
      return;
    }

    if (!confirm('¿Está seguro de eliminar esta categoría?')) return;
    
    try {
      await CategoriaService.eliminar(id);
      alert('✅ Categoría eliminada correctamente');
      this.cargarDatosIniciales();
    } catch (error) {
      console.error("Error al eliminar categoría:", error);
      alert('❌ Error al eliminar la categoría');
    }
  }

  // Métodos para Servicios
  async editarServicio(id) {
    try {
      const servicio = this.serviciosEnMemoria.find(s => s.id === id);
      if (servicio) {
        this.abrirModalServicio(id, servicio);
      }
    } catch (error) {
      console.error("Error al editar servicio:", error);
      alert('❌ Error al cargar el servicio');
    }
  }

  async eliminarServicio(id) {
    if (!confirm('¿Está seguro de eliminar este servicio?')) return;
    
    try {
      await ServicioService.eliminar(id);
      alert('✅ Servicio eliminado correctamente');
      this.cargarDatosIniciales();
    } catch (error) {
      console.error("Error al eliminar servicio:", error);
      alert('❌ Error al eliminar el servicio');
    }
  }

  // Métodos para Modales
  abrirModal(modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  cerrarTodosLosModales() {
    Object.values(this.modales).forEach(m => m.style.display = 'none');
    document.body.style.overflow = 'auto';
    this.formularios.categoria?.reset();
    this.formularios.servicio?.reset();
    document.getElementById('categoria-id').value = '';
    document.getElementById('servicio-id').value = '';
    document.getElementById('preview-imagen-servicio').style.display = 'none';
  }

  abrirModalCategoria(id = null, data = null) {
    const form = this.formularios.categoria;
    if (id && data) {
      document.getElementById('titulo-modal-categoria').textContent = 'Editar Categoría';
      form.querySelector('#categoria-id').value = id;
      form.querySelector('#categoria-nombre').value = data.nombre;
      form.querySelector('#categoria-descripcion').value = data.descripcion || '';
      form.querySelector('#categoria-orden').value = data.orden || 1;
      form.querySelector('#categoria-estado').value = data.estado || 'activo';
    } else {
      document.getElementById('titulo-modal-categoria').textContent = 'Agregar Categoría';
      form.reset();
      form.querySelector('#categoria-id').value = '';
    }
    this.abrirModal(this.modales.categoria);
  }

  async abrirModalServicio(id = null, data = null) {
    const form = this.formularios.servicio;
    await this.cargarCategoriasEnSelect();
    
    if (id && data) {
      document.getElementById('titulo-modal-servicio').textContent = 'Editar Servicio';
      form.querySelector('#servicio-id').value = id;
      form.querySelector('#servicio-nombre').value = data.nombre;
      form.querySelector('#servicio-descripcion').value = data.descripcion;
      form.querySelector('#servicio-precio').value = data.precio;
      form.querySelector('#servicio-categoriaId').value = data.categoriaId;
      form.querySelector('#servicio-duracion').value = data.duracion || '';
      form.querySelector('#servicio-horario').value = data.horario || '';
      form.querySelector('#servicio-imagen').value = data.imagen || '';
      form.querySelector('#servicio-estado').value = data.estado || 'activo';
      form.querySelector('#servicio-destacado').value = data.destacado ? 'true' : 'false';
      
      // Preview de imagen
      const preview = document.getElementById('preview-imagen-servicio');
      if (data.imagen) {
        preview.src = data.imagen;
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
      }
    } else {
      document.getElementById('titulo-modal-servicio').textContent = 'Agregar Servicio';
      form.reset();
      form.querySelector('#servicio-id').value = '';
      document.getElementById('preview-imagen-servicio').style.display = 'none';
    }
    this.abrirModal(this.modales.servicio);
  }

  async cargarCategoriasEnSelect() {
    const select = document.getElementById('servicio-categoriaId');
    if (!select) return;
    
    try {
      const categoriasActivas = this.categoriasEnMemoria.filter(c => c.estado === 'activo');
      select.innerHTML = '<option value="">Seleccione categoría</option>';
      categoriasActivas.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nombre;
        select.appendChild(opt);
      });
    } catch (error) {
      console.error("Error al cargar categorías en select:", error);
      select.innerHTML = '<option value="">Error al cargar categorías</option>';
    }
  }

  // Métodos para Guardar
  async guardarCategoria(e) {
    e.preventDefault();
    
    const id = document.getElementById('categoria-id').value;
    const data = {
      nombre: document.getElementById('categoria-nombre').value.trim(),
      descripcion: document.getElementById('categoria-descripcion').value.trim(),
      orden: parseInt(document.getElementById('categoria-orden').value) || 1,
      estado: document.getElementById('categoria-estado').value
    };

    if (!data.nombre) {
      alert('Por favor ingrese el nombre de la categoría');
      return;
    }

    try {
      if (id) {
        await CategoriaService.actualizar(id, data);
        alert('✅ Categoría actualizada correctamente');
      } else {
        await CategoriaService.crear(data);
        alert('✅ Categoría creada correctamente');
      }
      this.cerrarTodosLosModales();
      this.cargarDatosIniciales();
    } catch (error) {
      console.error("Error al guardar categoría:", error);
      alert('❌ Error al guardar la categoría');
    }
  }

  async guardarServicio(e) {
    e.preventDefault();
    
    const id = document.getElementById('servicio-id').value;
    const data = {
      nombre: document.getElementById('servicio-nombre').value.trim(),
      descripcion: document.getElementById('servicio-descripcion').value.trim(),
      precio: parseFloat(document.getElementById('servicio-precio').value),
      categoriaId: document.getElementById('servicio-categoriaId').value,
      duracion: document.getElementById('servicio-duracion').value.trim() || null,
      horario: document.getElementById('servicio-horario').value.trim() || null,
      imagen: document.getElementById('servicio-imagen').value.trim() || '',
      estado: document.getElementById('servicio-estado').value,
      destacado: document.getElementById('servicio-destacado').value === 'true'
    };

    if (!data.nombre || !data.descripcion || data.precio <= 0 || !data.categoriaId) {
      alert('Por favor complete todos los campos obligatorios correctamente');
      return;
    }

    try {
      if (id) {
        await ServicioService.actualizar(id, data);
        alert('✅ Servicio actualizado correctamente');
      } else {
        await ServicioService.crear(data);
        alert('✅ Servicio creado correctamente');
      }
      this.cerrarTodosLosModales();
      this.cargarDatosIniciales();
    } catch (error) {
      console.error("Error al guardar servicio:", error);
      alert('❌ Error al guardar el servicio');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('resultados-container')) {
    new AdminServicios();
  }
});