// js/huesped/carrito.js - SISTEMA COMPLETO DE CARRITO
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { app } from './firebase/config.js';

const auth = getAuth();
document
class Carrito {
    constructor() {
        this.carrito = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.cargarCarrito();
        this.bindEvents();
        this.renderCarrito();
    }
renderServiciosSeleccionadosModal() {
    const contenedor = document.getElementById("lista-servicios-modal");
    if (!contenedor) return;

    if (this.carrito.length === 0) {
        contenedor.innerHTML = `<p style="text-align:center; color:#777;">No hay servicios seleccionados</p>`;
        return;
    }
    contenedor.innerHTML = this.carrito.map(item => `
        <div class="servicio-item-modal">
            <div>
                <h4>${item.servicio.nombre}</h4>
                <small>S/ ${item.servicio.precio}</small>
            </div>

            <div class="cantidad-modal">
                <button onclick="disminuirCantidadServicio('${item.servicio.id}')">−</button>
                <span>${item.cantidad}</span>
                <button onclick="aumentarCantidadServicio('${item.servicio.id}')">+</button>
            </div>
        </div>
    `).join("");
}
    cargarCarrito() {
        const carritoGuardado = localStorage.getItem('carritoServicios');
        if (carritoGuardado) {
            this.carrito = JSON.parse(carritoGuardado);
        }
    }

    guardarCarrito() {
        localStorage.setItem('carritoServicios', JSON.stringify(this.carrito));
    }

    renderCarrito() {
        const container = document.getElementById('carrito-contenido');
        
        if (this.carrito.length === 0) {
            container.innerHTML = this.getHTMLCarritoVacio();
            return;
        }

        container.innerHTML = this.getHTMLCarritoLleno();
    }

    getHTMLCarritoVacio() {
        return `
            <div class="carrito-vacio">
                <i class="fas fa-shopping-cart"></i>
                <h3>Tu carrito está vacío</h3>
                <p>Agrega algunos servicios desde la página de inicio</p>
                <div style="margin-top: 30px;">
                    <a href="/huesped/huesped.html" class="btn">
                        <i class="fas fa-arrow-left"></i> Volver al Inicio
                    </a>
                </div>
            </div>
        `;
    }

    getHTMLCarritoLleno() {
        const subtotal = this.calcularSubtotal();
        const igv = subtotal * 0.18;
        const total = subtotal + igv;

        return `
            <div class="carrito-items">
                ${this.carrito.map(item => this.getHTMLItem(item)).join('')}
            </div>
            
            <div class="carrito-resumen">
                <h3>Resumen del Carrito</h3>
                <div class="resumen-item">
                    <span>Subtotal:</span>
                    <span>S/ ${subtotal.toFixed(2)}</span>
                </div>
                <div class="resumen-item">
                    <span>IGV (18%):</span>
                    <span>S/ ${igv.toFixed(2)}</span>
                </div>
                <div class="resumen-total">
                    <span>Total:</span>
                    <span>S/ ${total.toFixed(2)}</span>
                </div>
                
                <div class="carrito-actions">
                    <button class="btn btn-outline" id="seguir-comprando">
                        <i class="fas fa-arrow-left"></i> Seguir Comprando
                    </button>
                    <button class="btn" id="procesar-reserva">
                        <i class="fas fa-shopping-bag"></i> Proceder a Reserva
                    </button>
                    <button class="btn" style="background: #dc3545;" id="vaciar-carrito">
                        <i class="fas fa-trash"></i> Vaciar Carrito
                    </button>
                </div>
            </div>
        `;
    }

    getHTMLItem(item) {
        const subtotal = item.servicio.precio * item.cantidad;
        return `
            <div class="carrito-item">
                <div class="item-imagen">
                    <img src="${item.servicio.imagen || 'https://via.placeholder.com/100x80?text=Servicio'}" 
                         alt="${item.servicio.nombre}">
                </div>
                <div class="item-info">
                    <h4>${item.servicio.nombre}</h4>
                    <p>${item.servicio.descripcion}</p>
                </div>
                <div class="cantidad-controls">
                    <button class="btn-cantidad" onclick="carrito.disminuirCantidad('${item.servicio.id}')">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="cantidad">${item.cantidad}</span>
                    <button class="btn-cantidad" onclick="carrito.aumentarCantidad('${item.servicio.id}')">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="item-precio">
                    S/ ${item.servicio.precio} c/u
                </div>
                <div class="item-subtotal">
                    S/ ${subtotal.toFixed(2)}
                </div>
                <button class="btn-eliminar" onclick="carrito.eliminarServicio('${item.servicio.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    // ... (resto de los métodos se mantienen igual) ...

    aumentarCantidad(servicioId) {
        const item = this.carrito.find(item => item.servicio.id === servicioId);
        if (item) {
            item.cantidad += 1;
            this.guardarCarrito();
            this.renderCarrito();
        }
    }

    disminuirCantidad(servicioId) {
        const item = this.carrito.find(item => item.servicio.id === servicioId);
        if (item) {
            if (item.cantidad > 1) {
                item.cantidad -= 1;
            } else {
                this.eliminarServicio(servicioId);
                return;
            }
            this.guardarCarrito();
            this.renderCarrito();
        }
    }

    eliminarServicio(servicioId) {
        this.carrito = this.carrito.filter(item => item.servicio.id !== servicioId);
        this.guardarCarrito();
        this.renderCarrito();
        this.showNotification('Servicio eliminado del carrito');
    }

    vaciarCarrito() {
        if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
            this.carrito = [];
            this.guardarCarrito();
            this.renderCarrito();
            this.showNotification('Carrito vaciado');
        }
    }

    bindEvents() {
        // Seguir comprando
        document.addEventListener('click', (e) => {
            if (e.target.id === 'seguir-comprando' || e.target.closest('#seguir-comprando')) {
                window.location.href = '/huesped/huesped.html';
            }
        });

        // Proceder a reserva
        document.addEventListener('click', (e) => {
            if (e.target.id === 'procesar-reserva' || e.target.closest('#procesar-reserva')) {
                this.procesarReserva();
            }
        });

        // Vaciar carrito
        document.addEventListener('click', (e) => {
            if (e.target.id === 'vaciar-carrito' || e.target.closest('#vaciar-carrito')) {
                this.vaciarCarrito();
            }
        });

        // Cerrar sesión
        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            if(confirm('¿Está seguro de que desea cerrar sesión?')) {
                auth.signOut().then(() => {
                    window.location.href = '/index.html';
                });
            }
        });
    }
actualizarCantidadServicioEnModal(servicioId, cambio) {
    const item = this.carrito.find(s => s.servicio.id === servicioId);

    if (!item) return;

    item.cantidad += cambio;

    if (item.cantidad <= 0) {
        this.carrito = this.carrito.filter(s => s.servicio.id !== servicioId);
    }

    this.guardarCarrito();
    this.renderCarrito();   // refresca sidebar
    this.renderServiciosSeleccionadosModal(); // refresca modal

    this.actualizarBadge();
}
    procesarReserva() {
        // Verificar si hay una habitación seleccionada
        const habitacionSeleccionada = sessionStorage.getItem('habitacionSeleccionada');
        
        if (habitacionSeleccionada) {
            window.location.href = `reserva.html?habitacion=${habitacionSeleccionada}`;
        } else {
            if (confirm('No tienes una habitación seleccionada. ¿Te gustaría elegir una habitación primero?')) {
                window.location.href = 'huesped.html';
            }
        }
    }

    calcularSubtotal() {
        return this.carrito.reduce((total, item) => {
            return total + (item.servicio.precio * item.cantidad);
        }, 0);
    }

    showNotification(message) {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notification-text');
        
        if (notification && notificationText) {
            notificationText.textContent = message;
            notification.style.display = 'block';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
    }
    actualizarEstadoBotonReserva() {
    const boton = document.getElementById("proceed-to-reserve");
    const habitacion = sessionStorage.getItem("habitacionSeleccionada");

    if (!boton) return;

    // Si NO hay habitación elegida → bloquear
    if (!habitacion) {
        boton.disabled = true;
    } else {
        boton.disabled = false;
    }
}
}

document.addEventListener('DOMContentLoaded', () => {
    window.carrito = new Carrito();
});