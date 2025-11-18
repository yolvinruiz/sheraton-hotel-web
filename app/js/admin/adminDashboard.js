// js/admin/adminDashboard.js - VERSIÓN CON GRÁFICO DE GANANCIAS Y FILTROS FUNCIONALES
import { ReservaService } from '../firebase/services/reservaService.js';
import { TipoHabitacionService } from '../firebase/services/tipoHabitacionService.js';
import { UnidadHabitacionService } from '../firebase/services/unidadHabitacionService.js';

class AdminDashboard {
  constructor() {
    this.reservas = [];
    this.tiposHabitacion = [];
    this.unidades = [];
    this.charts = {};
    
    this.filtros = {
      rango: 'mes',
      vista: 'general'
    };

    this.init();
  }

  async init() {
    this.bindEvents();
    await this.cargarDatos();
    this.inicializarGraficos();
    this.actualizarDashboard();
  }

  bindEvents() {
    // Filtros
    document.getElementById('filtro-rango')?.addEventListener('change', (e) => {
      this.filtros.rango = e.target.value;
      this.actualizarDashboard();
    });

    document.getElementById('filtro-vista')?.addEventListener('change', (e) => {
      this.filtros.vista = e.target.value;
      this.actualizarDashboard();
    });

    // Botón actualizar
    document.getElementById('btn-actualizar')?.addEventListener('click', async () => {
      await this.cargarDatos();
      this.actualizarDashboard();
    });
  }

  async cargarDatos() {
    try {
      console.log("📥 Cargando datos para dashboard...");
      
      const [reservas, tipos, unidades] = await Promise.all([
        ReservaService.listar(),
        TipoHabitacionService.listar(),
        UnidadHabitacionService.listarTodas()
      ]);

      this.reservas = reservas;
      this.tiposHabitacion = tipos;
      this.unidades = unidades;

      console.log("✅ Datos cargados:", {
        reservas: reservas.length,
        tipos: tipos.length,
        unidades: unidades.length
      });

    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      alert('Error al cargar los datos del dashboard');
    }
  }

  inicializarGraficos() {
    // Gráfico de ganancias por mes
    const ctxGanancias = document.getElementById('chart-ganancias');
    if (ctxGanancias) {
      this.charts.ganancias = new Chart(ctxGanancias, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Ganancias (S/)',
            data: [],
            borderColor: '#28a745',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return 'S/ ' + value;
                }
              }
            }
          }
        }
      });
    }

    // Gráfico de estados de reserva
    const ctxEstados = document.getElementById('chart-estados');
    if (ctxEstados) {
      this.charts.estados = new Chart(ctxEstados, {
        type: 'doughnut',
        data: {
          labels: ['Pendientes', 'Confirmadas', 'Activas', 'Completadas', 'Canceladas'],
          datasets: [{
            data: [0, 0, 0, 0, 0],
            backgroundColor: [
              '#fff3cd',
              '#d4edda',
              '#d1ecf1',
              '#e2e3e5',
              '#f8d7da'
            ],
            borderColor: [
              '#856404',
              '#155724',
              '#0c5460',
              '#383d41',
              '#721c24'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
            }
          }
        }
      });
    }
  }

  actualizarDashboard() {
    const reservasFiltradas = this.filtrarReservasPorRango(this.reservas, this.filtros.rango);
    this.actualizarMetricas(reservasFiltradas);
    this.actualizarGraficos(reservasFiltradas);
    this.actualizarListas(reservasFiltradas);
  }

  actualizarMetricas(reservasFiltradas) {
    console.log("🔍 Reservas filtradas para métricas:", reservasFiltradas.length);

    // Total de reservas
    const totalReservas = reservasFiltradas.length;
    const totalTodasReservas = this.reservas.length;
    const cambioReservas = totalTodasReservas > 0 ? 
      ((totalReservas / totalTodasReservas) * 100).toFixed(1) : 0;

    document.getElementById('metric-total-reservas').textContent = totalReservas;
    document.getElementById('metric-cambio-reservas').textContent = 
      `${cambioReservas}% del total`;
    document.getElementById('metric-cambio-reservas').className = 
      `metric-change ${cambioReservas >= 50 ? 'positive' : 'negative'}`;

    // Ocupación
    const totalUnidades = this.unidades.length;
    const unidadesDisponibles = this.unidades.filter(u => u.estado === 'disponible').length;
    const unidadesOcupadas = totalUnidades - unidadesDisponibles;
    const tasaOcupacion = totalUnidades > 0 ? ((unidadesOcupadas / totalUnidades) * 100).toFixed(1) : 0;

    document.getElementById('metric-ocupacion').textContent = `${tasaOcupacion}%`;
    document.getElementById('metric-habitaciones-ocupadas').textContent = 
      `${unidadesOcupadas}/${totalUnidades} habitaciones`;

    // Ingresos - CORREGIDO
    const ingresos = reservasFiltradas.reduce((sum, reserva) => {
      if (reserva.total) {
        return sum + parseFloat(reserva.total);
      } else if (reserva.habitacionPrecio && reserva.noches) {
        return sum + (parseFloat(reserva.habitacionPrecio) * parseInt(reserva.noches));
      }
      return sum;
    }, 0);

    const ingresosTotales = this.reservas.reduce((sum, reserva) => {
      if (reserva.total) return sum + parseFloat(reserva.total);
      if (reserva.habitacionPrecio && reserva.noches) return sum + (parseFloat(reserva.habitacionPrecio) * parseInt(reserva.noches));
      return sum;
    }, 0);

    const cambioIngresos = ingresosTotales > 0 ? ((ingresos / ingresosTotales) * 100).toFixed(1) : 0;

    document.getElementById('metric-ingresos').textContent = `S/ ${ingresos.toFixed(2)}`;
    document.getElementById('metric-cambio-ingresos').textContent = 
      `${cambioIngresos}% del total`;
    document.getElementById('metric-cambio-ingresos').className = 
      `metric-change ${cambioIngresos >= 50 ? 'positive' : 'negative'}`;

    // Tasa de cancelación
    const canceladas = reservasFiltradas.filter(r => r.estado === 'cancelada').length;
    const tasaCancelacion = totalReservas > 0 ? ((canceladas / totalReservas) * 100).toFixed(1) : 0;
    const canceladasTotales = this.reservas.filter(r => r.estado === 'cancelada').length;
    const cambioCancelacion = canceladasTotales > 0 ? 
      ((canceladas / canceladasTotales) * 100).toFixed(1) : 0;
    
    document.getElementById('metric-cancelacion').textContent = `${tasaCancelacion}%`;
    document.getElementById('metric-cambio-cancelacion').textContent = 
      `${cambioCancelacion}% del total`;
    document.getElementById('metric-cambio-cancelacion').className = 
      `metric-change ${cambioCancelacion <= 50 ? 'positive' : 'negative'}`;

    // Reservas activas y check-ins
    const activas = reservasFiltradas.filter(r => r.estado === 'activa').length;
    const hoy = new Date().toISOString().split('T')[0];
    const checkinsHoy = reservasFiltradas.filter(r => r.checkin === hoy).length;

    document.getElementById('metric-activas').textContent = activas;
    document.getElementById('metric-checkins-hoy').textContent = `${checkinsHoy} check-ins hoy`;

    // Servicios vendidos - CORREGIDO
    const serviciosVendidos = reservasFiltradas.reduce((total, reserva) => {
      if (reserva.servicios && Array.isArray(reserva.servicios)) {
        return total + reserva.servicios.reduce((sumServ, servicio) => {
          return sumServ + (parseInt(servicio.cantidad) || 1);
        }, 0);
      }
      return total;
    }, 0);

    const serviciosTotales = this.reservas.reduce((total, reserva) => {
      if (reserva.servicios && Array.isArray(reserva.servicios)) {
        return total + reserva.servicios.reduce((sumServ, servicio) => {
          return sumServ + (parseInt(servicio.cantidad) || 1);
        }, 0);
      }
      return total;
    }, 0);

    const cambioServicios = serviciosTotales > 0 ? 
      ((serviciosVendidos / serviciosTotales) * 100).toFixed(1) : 0;

    document.getElementById('metric-servicios').textContent = serviciosVendidos;
    document.getElementById('metric-cambio-servicios').textContent = 
      `${cambioServicios}% del total`;
    document.getElementById('metric-cambio-servicios').className = 
      `metric-change ${cambioServicios >= 50 ? 'positive' : 'negative'}`;
  }

  actualizarGraficos(reservasFiltradas) {
    // Actualizar gráfico de estados con datos reales
    if (this.charts.estados) {
      const estados = ['pendiente', 'confirmada', 'activa', 'completada', 'cancelada'];
      const datos = estados.map(estado => 
        reservasFiltradas.filter(r => r.estado === estado).length
      );
      
      console.log("📊 Datos para gráfico de estados:", datos);
      
      this.charts.estados.data.datasets[0].data = datos;
      this.charts.estados.update();
    }

    // Actualizar gráfico de ganancias con datos reales
    if (this.charts.ganancias) {
      const { labels, datos } = this.calcularGananciasPorMes(reservasFiltradas);
      this.charts.ganancias.data.labels = labels;
      this.charts.ganancias.data.datasets[0].data = datos;
      this.charts.ganancias.update();
    }
  }

  actualizarListas(reservasFiltradas) {
    this.actualizarReservasRecientes(reservasFiltradas);
    this.actualizarHabitacionesPopulares(reservasFiltradas);
    this.actualizarServiciosPopulares(reservasFiltradas);
  }

  actualizarReservasRecientes(reservasFiltradas) {
    const lista = document.getElementById('lista-reservas-recientes');
    if (!lista) return;

    // Ordenar reservas por fecha más reciente
    const reservasRecientes = [...reservasFiltradas]
      .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
      .slice(0, 5);

    console.log("📋 Reservas recientes:", reservasRecientes);

    if (reservasRecientes.length === 0) {
      lista.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hay reservas recientes</p>';
      return;
    }

    lista.innerHTML = reservasRecientes.map(reserva => `
      <li class="recent-item">
        <div class="item-info">
          <h4>${reserva.huespedNombre || reserva.clienteNombre || 'Cliente'}</h4>
          <p>Hab. ${reserva.unidadNumero || 'N/A'} • ${this.formatearFecha(reserva.checkin)}</p>
          <small>${reserva.codigoReserva || ''}</small>
        </div>
        <span class="estado-badge ${reserva.estado}">${this.formatearEstado(reserva.estado)}</span>
      </li>
    `).join('');
  }

  actualizarHabitacionesPopulares(reservasFiltradas) {
    const lista = document.getElementById('lista-habitaciones-populares');
    if (!lista) return;

    const contador = {};
    reservasFiltradas.forEach(reserva => {
      const tipoId = reserva.tipoHabitacionId;
      const habitacionNombre = reserva.habitacionNombre;
      
      if (tipoId) {
        contador[tipoId] = (contador[tipoId] || 0) + 1;
      } else if (habitacionNombre) {
        contador[habitacionNombre] = (contador[habitacionNombre] || 0) + 1;
      }
    });

    const populares = Object.entries(contador)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([idOrName, count]) => {
        if (this.tiposHabitacion.find(t => t.id === idOrName)) {
          const tipo = this.tiposHabitacion.find(t => t.id === idOrName);
          return { nombre: tipo?.nombre || 'Tipo desconocido', count };
        } else {
          return { nombre: idOrName, count };
        }
      });

    if (populares.length === 0) {
      lista.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hay datos suficientes</p>';
      return;
    }

    lista.innerHTML = populares.map((item, index) => `
      <li class="recent-item">
        <div class="item-info">
          <h4>${item.nombre}</h4>
          <p>${item.count} reservas</p>
        </div>
        <span style="color: var(--primary); font-weight: bold;">#${index + 1}</span>
      </li>
    `).join('');
  }

  actualizarServiciosPopulares(reservasFiltradas) {
    const lista = document.getElementById('lista-servicios-populares');
    if (!lista) return;

    const contador = {};
    
    reservasFiltradas.forEach(reserva => {
      if (reserva.servicios && Array.isArray(reserva.servicios)) {
        reserva.servicios.forEach(servicioReserva => {
          const servicio = servicioReserva.servicio;
          if (servicio && servicio.nombre) {
            const cantidad = parseInt(servicioReserva.cantidad) || 1;
            contador[servicio.nombre] = (contador[servicio.nombre] || 0) + cantidad;
          }
        });
      }
    });

    const populares = Object.entries(contador)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([nombre, count]) => ({ nombre, count }));

    if (populares.length === 0) {
      lista.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hay servicios registrados</p>';
      return;
    }

    lista.innerHTML = populares.map((item, index) => `
      <li class="recent-item">
        <div class="item-info">
          <h4>${item.nombre}</h4>
          <p>${item.count} solicitudes</p>
        </div>
        <span style="color: var(--primary); font-weight: bold;">#${index + 1}</span>
      </li>
    `).join('');
  }

  // MÉTODOS DE FILTRADO CORREGIDOS
  filtrarReservasPorRango(reservas, rango) {
    const ahora = new Date();
    let fechaInicio;

    switch (rango) {
      case 'hoy':
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        break;
      case 'semana':
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 7);
        break;
      case 'mes':
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        break;
      case 'trimestre':
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth() - 3, 1);
        break;
      case 'anio':
        fechaInicio = new Date(ahora.getFullYear(), 0, 1);
        break;
      case 'todo':
      default:
        return reservas;
    }

    console.log(`📅 Filtro aplicado: ${rango}, fecha inicio:`, fechaInicio);

    return reservas.filter(reserva => {
      let fechaReserva;
      
      // Intentar obtener la fecha de creación de la reserva
      if (reserva.fechaCreacion) {
        fechaReserva = new Date(reserva.fechaCreacion);
      } else if (reserva.fechaReserva) {
        fechaReserva = new Date(reserva.fechaReserva);
      } else if (reserva.checkin) {
        fechaReserva = new Date(reserva.checkin);
      } else {
        // Si no hay fecha, incluir la reserva
        return true;
      }
      
      return fechaReserva >= fechaInicio;
    });
  }

  calcularGananciasPorMes(reservas) {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const gananciasPorMes = {};
    const ahora = new Date();

    // Inicializar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const clave = `${fecha.getFullYear()}-${fecha.getMonth()}`;
      gananciasPorMes[clave] = {
        mes: fecha.getMonth(),
        año: fecha.getFullYear(),
        total: 0
      };
    }

    // Calcular ganancias por mes
    reservas.forEach(reserva => {
      let fechaReserva;
      
      if (reserva.fechaCreacion) {
        fechaReserva = new Date(reserva.fechaCreacion);
      } else if (reserva.fechaReserva) {
        fechaReserva = new Date(reserva.fechaReserva);
      } else if (reserva.checkin) {
        fechaReserva = new Date(reserva.checkin);
      } else {
        return; // Saltar reservas sin fecha
      }

      const clave = `${fechaReserva.getFullYear()}-${fechaReserva.getMonth()}`;
      
      if (gananciasPorMes[clave]) {
        const monto = reserva.total || 
          (reserva.habitacionPrecio && reserva.noches ? 
           parseFloat(reserva.habitacionPrecio) * parseInt(reserva.noches) : 0);
        
        gananciasPorMes[clave].total += monto;
      }
    });

    // Preparar datos para el gráfico
    const labels = Object.values(gananciasPorMes)
      .sort((a, b) => new Date(a.año, a.mes) - new Date(b.año, b.mes))
      .map(item => `${meses[item.mes]} ${item.año}`);

    const datos = Object.values(gananciasPorMes)
      .sort((a, b) => new Date(a.año, a.mes) - new Date(b.año, b.mes))
      .map(item => item.total);

    console.log("💰 Datos para gráfico de ganancias:", { labels, datos });

    return { labels, datos };
  }

  formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-ES');
    } catch (error) {
      return fecha;
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
}

document.addEventListener('DOMContentLoaded', () => {
  new AdminDashboard();
});