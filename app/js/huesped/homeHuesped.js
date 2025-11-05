// js/huesped/homeHuesped.js - VERSIÓN CORREGIDA
import { TipoHabitacionService } from '../firebase/services/tipoHabitacionService.js';
import { UnidadHabitacionService } from '../firebase/services/unidadHabitacionService.js';
import { ServicioService } from '../firebase/services/servicioService.js';
import { CategoriaService } from '../firebase/services/categoriaService.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { app, db } from '../firebase/config.js';

const auth = getAuth(app);

class HomeHuesped {
    constructor() {
        this.rooms = [];
        this.services = [];
        this.categories = [];
        this.filteredRooms = [];
        this.filteredServices = [];
        this.carrito = [];
        this.currentUser = null;
        this.userData = null;
        this.userPreferences = null;
        
        // Filtros iniciales DESMARCADOS
        this.activeFilters = {
            roomType: [],
            priceRange: [],
            amenities: [],
            searchTerm: '',
            serviceCategory: 'all'
        };

        this.init();
    }

    async init() {
        await this.checkAuth();
        this.bindEvents();
        await this.loadData();
        this.setDefaultDates();
        this.cargarCarrito();
        this.renderCarritoSidebar();
    }

    async checkAuth() {
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    this.currentUser = user;
                    console.log("👤 Usuario autenticado:", user.uid);
                    await this.loadUserData(user.uid);
                    resolve();
                } else {
                    console.log("❌ No hay usuario autenticado, redirigiendo...");
                    window.location.href = '/index.html';
                }
            });
        });
    }

    // MÉTODOS DEL CARRITO
    cargarCarrito() {
        const carritoGuardado = localStorage.getItem('carritoServicios');
        if (carritoGuardado) {
            this.carrito = JSON.parse(carritoGuardado);
        }
        this.actualizarBadgeCarrito();
    }

    guardarCarrito() {
        localStorage.setItem('carritoServicios', JSON.stringify(this.carrito));
        this.actualizarBadgeCarrito();
        this.renderCarritoSidebar();
    }

    actualizarBadgeCarrito() {
        const totalItems = this.carrito.reduce((total, item) => total + item.cantidad, 0);
        const badge = document.getElementById('nav-cart-badge');
        if (badge) {
            badge.textContent = totalItems;
            if (totalItems === 0) {
                badge.style.display = 'none';
            } else {
                badge.style.display = 'flex';
            }
        }
    }

    mostrarCarrito() {
        const sidebar = document.getElementById('cart-sidebar');
        const overlay = document.getElementById('cart-overlay');
        
        if (sidebar && overlay) {
            sidebar.classList.add('open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    ocultarCarrito() {
        const sidebar = document.getElementById('cart-sidebar');
        const overlay = document.getElementById('cart-overlay');
        
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    renderCarritoSidebar() {
        const container = document.getElementById('cart-items');
        const emptyMessage = document.getElementById('cart-empty');
        const totalAmount = document.getElementById('cart-total-amount');
        
        if (!container) return;

        if (this.carrito.length === 0) {
            container.innerHTML = '';
            if (emptyMessage) emptyMessage.style.display = 'block';
            if (totalAmount) totalAmount.textContent = 'S/ 0.00';
            return;
        }

        if (emptyMessage) emptyMessage.style.display = 'none';

        let html = '';
        let subtotal = 0;

        this.carrito.forEach(item => {
            const itemSubtotal = item.servicio.precio * item.cantidad;
            subtotal += itemSubtotal;

            html += `
                <div class="cart-item">
                    <div class="cart-item-image">
                        <img src="${item.servicio.imagen || 'https://via.placeholder.com/80x60?text=Servicio'}" 
                             alt="${item.servicio.nombre}">
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.servicio.nombre}</div>
                        <div class="cart-item-price">S/ ${item.servicio.precio} c/u</div>
                        <div class="cart-item-controls">
                            <button class="cart-quantity-btn" onclick="homeHuesped.disminuirCantidad('${item.servicio.id}')">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="cart-quantity">${item.cantidad}</span>
                            <button class="cart-quantity-btn" onclick="homeHuesped.aumentarCantidad('${item.servicio.id}')">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="cart-remove-btn" onclick="homeHuesped.eliminarDelCarrito('${item.servicio.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        
        if (totalAmount) {
            totalAmount.textContent = `S/ ${subtotal.toFixed(2)}`;
        }
    }

    aumentarCantidad(servicioId) {
        const item = this.carrito.find(item => item.servicio.id === servicioId);
        if (item) {
            item.cantidad += 1;
            this.guardarCarrito();
        }
    }

    disminuirCantidad(servicioId) {
        const item = this.carrito.find(item => item.servicio.id === servicioId);
        if (item) {
            if (item.cantidad > 1) {
                item.cantidad -= 1;
                this.guardarCarrito();
            } else {
                this.eliminarDelCarrito(servicioId);
            }
        }
    }

    eliminarDelCarrito(servicioId) {
        this.carrito = this.carrito.filter(item => item.servicio.id !== servicioId);
        this.guardarCarrito();
        this.showNotification('Servicio eliminado del carrito');
    }

    agregarServicio(serviceId) {
        console.log("Agregar servicio:", serviceId);
        const service = this.services.find(s => s.id === serviceId);
        
        if (service) {
            const itemExistente = this.carrito.find(item => item.servicio.id === serviceId);
            
            if (itemExistente) {
                itemExistente.cantidad += 1;
                this.showNotification(`Se agregó otra unidad de "${service.nombre}". Total: ${itemExistente.cantidad}`);
            } else {
                this.carrito.push({
                    servicio: service,
                    cantidad: 1
                });
                this.showNotification(`"${service.nombre}" agregado al carrito`);
            }
            
            this.guardarCarrito();
            this.mostrarCarrito();
        }
    }
actualizarEstadoBotonReserva() {
    const boton = document.getElementById("proceed-to-reserve");
    const habitacion = sessionStorage.getItem("habitacionSeleccionada");

    if (!boton) return;

    if (!habitacion) {
        boton.disabled = true;
    } else {
        boton.disabled = false;
    }
}

    procederAReserva() {
        const habitacionSeleccionada = sessionStorage.getItem('habitacionSeleccionada');
        
        if (habitacionSeleccionada) {
            this.ocultarCarrito();
            window.location.href = `/reserva.html?habitacion=${habitacionSeleccionada}`;
        } else {
            this.ocultarCarrito();
            if (confirm('No tienes una habitación seleccionada. ¿Te gustaría elegir una habitación primero?')) {
                window.location.href = 'huesped.html';
            }
        }
    }

    // MÉTODOS EXISTENTES (sin cambios)
    async loadUserData(uid) {
        try {
            console.log("📥 Cargando datos del huésped con UID:", uid);
            const userDoc = await getDoc(doc(db, "huespedes", uid));
            
            if (userDoc.exists()) {
                this.userData = userDoc.data();
                this.userPreferences = this.userData.preferencias;
                console.log("✅ Datos del huésped cargados:", this.userData);
                console.log("🎯 Preferencias:", this.userPreferences);
                this.renderUserInfo();
            } else {
                console.log("❌ No se encontró el perfil del huésped en Firestore");
                await this.crearPerfilHuesped(uid, this.currentUser.email);
            }
        } catch (error) {
            console.error("Error al cargar datos del usuario:", error);
            this.showError("Error al cargar el perfil del usuario");
        }
    }

    async crearPerfilHuesped(uid, email) {
        try {
            const datosHuesped = {
                email: email,
                nombre: email.split('@')[0],
                apellidos: '',
                dni: '',
                telefono: '',
                edad: 0,
                genero: '',
                preferencias: {
                    tipoViaje: 'vacaciones',
                    nivelComodidad: 'estandar',
                    habitaciones: [],
                    servicios: [],
                    solicitudesEspeciales: ''
                },
                historial: {
                    reservas: 0,
                    ultimaVisita: null,
                    serviciosUtilizados: [],
                    reservasRealizadas: []
                },
                configuracion: {
                    recibirRecomendaciones: true,
                    notificacionesPersonalizadas: true
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                estado: 'activo'
            };

            await setDoc(doc(db, "huespedes", uid), datosHuesped);
            console.log("✅ Perfil de huésped creado automáticamente");
            this.userData = datosHuesped;
            this.userPreferences = datosHuesped.preferencias;
            this.renderUserInfo();
        } catch (error) {
            console.error('Error al crear perfil de huésped:', error);
            this.showError("Error al crear el perfil de huésped");
        }
    }

    renderUserInfo() {
        if (!this.userData) return;

        try {
            const userNameElement = document.getElementById('user-name');
            const userAvatarElement = document.getElementById('user-avatar');

            if (userNameElement) {
                const nombreCompleto = `${this.userData.nombre || ''} ${this.userData.apellidos || ''}`.trim();
                userNameElement.textContent = nombreCompleto || this.userData.email;
            }

            if (userAvatarElement) {
                const iniciales = (this.userData.nombre?.charAt(0) || '') + (this.userData.apellidos?.charAt(0) || '');
                userAvatarElement.textContent = iniciales || 'HU';
            }
        } catch (error) {
            console.error("Error al renderizar información del usuario:", error);
        }
    }

    showError(message) {
        console.error("❌ Error:", message);
        
        const roomsContainer = document.getElementById('rooms-container');
        if (roomsContainer) {
            roomsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px;"></i>
                    <h3>Error al cargar los datos</h3>
                    <p>${message}</p>
                    <button class="btn" onclick="window.location.reload()">Reintentar</button>
                </div>
            `;
        }
    }

    reservarHabitacion(roomId) {
        console.log("Reservar habitación:", roomId);
        
        sessionStorage.setItem('habitacionSeleccionada', roomId);
        window.dispatchEvent(new Event("storage"));
        sessionStorage.setItem('checkin', document.getElementById('checkin').value);
        sessionStorage.setItem('checkout', document.getElementById('checkout').value);
        
        if (this.carrito.length > 0) {
            this.mostrarCarrito();
        } else {
            window.location.href = `reserva.html?habitacion=${roomId}`;
        }
    }

    async loadData() {
        try {
            console.log("📥 Cargando datos de habitaciones y servicios...");
            
            const [tipos, servicios, categorias] = await Promise.all([
                TipoHabitacionService.listar(),
                ServicioService.listar(),
                CategoriaService.listar()
            ]);

            console.log("📊 Datos cargados:");
            console.log("- Tipos de habitación:", tipos);
            console.log("- Servicios:", servicios);
            console.log("- Categorías:", categorias);

            const unidadesPromises = tipos.map(async (tipo) => {
                const unidades = await UnidadHabitacionService.listarPorTipo(tipo.id);
                return {
                    ...tipo,
                    unidades: unidades,
                    disponible: unidades.some(u => u.estado === 'disponible'),
                    unidadesDisponibles: unidades.filter(u => u.estado === 'disponible').length
                };
            });

            this.rooms = await Promise.all(unidadesPromises);
            this.services = servicios;
            this.categories = categorias;

            console.log("✅ Servicios cargados:", this.services.length);
            console.log("✅ Categorías cargadas:", this.categories);

            this.applyFilters();
            this.renderRoomTypeFilters();
            this.renderServiceCategories();

            console.log("✅ Datos cargados correctamente");

        } catch (error) {
            console.error("Error al cargar datos:", error);
            this.showError("Error al cargar los datos. Por favor, recarga la página.");
        }
    }

    bindEvents() {
        console.log("🔗 Configurando eventos...");
        
        // Toggle menu for mobile
        document.querySelector('.menu-toggle')?.addEventListener('click', () => {
            document.querySelector('.nav-links').classList.toggle('active');
        });

        // Toggle user menu
        const userMenuToggle = document.getElementById('user-menu-toggle');
        const userMenu = document.getElementById('user-menu');
        
        if (userMenuToggle && userMenu) {
            userMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenu.classList.toggle('active');
            });

            document.addEventListener('click', () => {
                userMenu.classList.remove('active');
            });
        }

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            if(confirm('¿Está seguro de que desea cerrar sesión?')) {
                signOut(auth).then(() => {
                    window.location.href = '/index.html';
                });
            }
        });

        // Profile button
        document.getElementById('perfil-btn')?.addEventListener('click', () => {
            window.location.href = 'perfil.html';
        });

        // Eventos del carrito (SOLO UNA VEZ - SIN DUPLICADOS)
        const cartToggle = document.getElementById('nav-cart-toggle');
        const closeCart = document.getElementById('close-cart');
        const cartOverlay = document.getElementById('cart-overlay');
        const proceedToReserve = document.getElementById('proceed-to-reserve');

        if (cartToggle) {
            cartToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.mostrarCarrito();
            });
        }

        if (closeCart) {
            closeCart.addEventListener('click', () => {
                this.ocultarCarrito();
            });
        }

        if (cartOverlay) {
            cartOverlay.addEventListener('click', () => {
                this.ocultarCarrito();
            });
        }

        if (proceedToReserve) {
            proceedToReserve.addEventListener('click', () => {
                this.procederAReserva();
            });
        }

        // Search functionality
        this.bindSearchEvents();
        
        // Filter events
        this.bindFilterEvents();

        // Tab events
        this.bindTabEvents();

        console.log("✅ Eventos configurados");
    }

    // ... (el resto de los métodos se mantienen igual - bindSearchEvents, bindFilterEvents, etc.)

    bindSearchEvents() {
        const searchInput = document.getElementById('search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.activeFilters.searchTerm = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.applyFilters();
            });
        }
    }

    bindFilterEvents() {
        document.addEventListener('change', (e) => {
            if (e.target.name === 'room-type') {
                this.updateRoomTypeFilters();
            }
            if (e.target.name === 'price-range') {
                this.updatePriceRangeFilters();
            }
            if (e.target.name === 'amenities') {
                this.updateAmenitiesFilters();
            }
        });

        const clearFiltersBtn = document.getElementById('clear-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearFilters();
            });
        }

        const sortSelect = document.getElementById('sort-rooms');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortRooms(e.target.value);
            });
        }

        const serviceFilter = document.getElementById('filter-recommendations');
        if (serviceFilter) {
            serviceFilter.addEventListener('change', (e) => {
                this.activeFilters.serviceCategory = e.target.value;
                this.applyFilters();
            });
        }
    }

    bindTabEvents() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    updateRoomTypeFilters() {
        const checkedBoxes = document.querySelectorAll('input[name="room-type"]:checked');
        this.activeFilters.roomType = Array.from(checkedBoxes).map(cb => cb.value);
        this.applyFilters();
    }

    updatePriceRangeFilters() {
        const checkedBoxes = document.querySelectorAll('input[name="price-range"]:checked');
        this.activeFilters.priceRange = Array.from(checkedBoxes).map(cb => cb.value);
        this.applyFilters();
    }

    updateAmenitiesFilters() {
        const checkedBoxes = document.querySelectorAll('input[name="amenities"]:checked');
        this.activeFilters.amenities = Array.from(checkedBoxes).map(cb => cb.value);
        this.applyFilters();
    }

    clearFilters() {
        console.log("🧹 Limpiando todos los filtros...");
        
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        const searchInput = document.getElementById('search');
        if (searchInput) searchInput.value = '';

        const serviceFilter = document.getElementById('filter-recommendations');
        if (serviceFilter) serviceFilter.value = 'all';

        const sortSelect = document.getElementById('sort-rooms');
        if (sortSelect) sortSelect.value = 'recomendadas-primero';

        this.activeFilters = {
            roomType: [],
            priceRange: [],
            amenities: [],
            searchTerm: '',
            serviceCategory: 'all'
        };

        this.applyFilters();
        this.showNotification("Todos los filtros han sido limpiados");
    }

    applyFilters() {
        this.filterRooms();
        this.filterServices();
    }

    filterRooms() {
        let filtered = this.rooms.filter(room => room.disponible);

        if (this.activeFilters.searchTerm) {
            filtered = filtered.filter(room => 
                room.nombre.toLowerCase().includes(this.activeFilters.searchTerm) ||
                room.descripcion.toLowerCase().includes(this.activeFilters.searchTerm) ||
                room.tipo.toLowerCase().includes(this.activeFilters.searchTerm)
            );
        }

        if (this.activeFilters.roomType.length > 0) {
            filtered = filtered.filter(room => 
                this.activeFilters.roomType.includes(room.tipo)
            );
        }

        if (this.activeFilters.priceRange.length > 0) {
            filtered = filtered.filter(room => {
                const price = room.precioPorNoche;
                return this.activeFilters.priceRange.some(range => {
                    switch (range) {
                        case '100-200': return price >= 100 && price <= 200;
                        case '200-300': return price >= 200 && price <= 300;
                        case '300-500': return price >= 300 && price <= 500;
                        case '500+': return price > 500;
                        default: return true;
                    }
                });
            });
        }

        if (this.activeFilters.amenities.length > 0) {
            filtered = filtered.filter(room => {
                if (this.activeFilters.amenities.includes('desayuno') && !room.incluyeDesayuno) return false;
                if (this.activeFilters.amenities.includes('vista') && !room.vista) return false;
                if (this.activeFilters.amenities.includes('wifi') && !room.wifiIncluido) return false;
                return true;
            });
        }

        this.filteredRooms = this.sortRoomsByRelevance(filtered);
        this.renderRooms(this.filteredRooms);
    }

    filterServices() {
        console.log("🔍 Filtrando servicios...");
        
        let filtered = [...this.services];

        if (this.activeFilters.searchTerm) {
            filtered = filtered.filter(service => 
                service.nombre.toLowerCase().includes(this.activeFilters.searchTerm) ||
                (service.descripcion && service.descripcion.toLowerCase().includes(this.activeFilters.searchTerm))
            );
        }

        if (this.activeFilters.serviceCategory !== 'all') {
            filtered = filtered.filter(service => {
                const categoria = this.categories.find(c => c.id === service.categoriaId);
                if (!categoria) return false;
                return service.categoriaId === this.activeFilters.serviceCategory;
            });
        }

        filtered.sort((a, b) => {
            const aRecomendado = this.isServiceRecommended(a);
            const bRecomendado = this.isServiceRecommended(b);
            
            if (aRecomendado && !bRecomendado) return -1;
            if (!aRecomendado && bRecomendado) return 1;
            return 0;
        });

        this.filteredServices = filtered;
        console.log("✅ Servicios a mostrar:", this.filteredServices.length);
        this.renderServices(this.filteredServices);
    }

    renderServiceCategories() {
        const serviceFilter = document.getElementById('filter-recommendations');
        if (!serviceFilter) return;

        serviceFilter.innerHTML = '<option value="all">Todas las categorías</option>';
        
        this.categories.forEach(categoria => {
            if (categoria.estado === 'activo') {
                const option = document.createElement('option');
                option.value = categoria.id;
                option.textContent = categoria.nombre;
                serviceFilter.appendChild(option);
            }
        });

        console.log("✅ Categorías cargadas en el filtro:", this.categories.length);
    }

    renderRooms(rooms) {
        const container = document.getElementById('rooms-container');
        if (!container) return;

        if (rooms.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px;"></i>
                    <h3>No se encontraron habitaciones</h3>
                    <p>Intenta ajustar tus filtros de búsqueda</p>
                </div>
            `;
            return;
        }

        let html = '';
        rooms.forEach(room => {
            const imagen = room.imagen || 'https://via.placeholder.com/300x200?text=Habitación';
            const recomendada = this.isRoomRecommended(room) ? '<div class="room-badge recomendada">RECOMENDADA</div>' : '';
            const desayunoIncluido = room.incluyeDesayuno ? '<span><i class="fas fa-coffee"></i> Desayuno</span>' : '';
            const esRecomendada = this.isRoomRecommended(room);
            
            const razonesRecomendacion = this.getRecomendationReasons(room);
            const tooltipRecomendacion = razonesRecomendacion.length > 0 ? 
                `title="Recomendada porque: ${razonesRecomendacion.join(', ')}"` : '';
            
            html += `
                <div class="room-card ${esRecomendada ? 'recomendada' : ''}" ${tooltipRecomendacion}>
                    <div class="room-image">
                        <img src="${imagen}" alt="${room.nombre}" onerror="this.src='https://via.placeholder.com/300x200?text=Error+imagen'">
                        ${recomendada}
                    </div>
                    <div class="room-info">
                        <h3>${this.escapeHtml(room.nombre)}</h3>
                        <p>${this.escapeHtml(room.descripcion)}</p>
                        <div class="room-features">
                            <span><i class="fas fa-users"></i> ${room.capacidad} pers.</span>
                            <span><i class="fas fa-binoculars"></i> ${room.vista}</span>
                            ${desayunoIncluido}
                            <span><i class="fas fa-door-open"></i> ${room.unidadesDisponibles} disp.</span>
                        </div>
                        ${razonesRecomendacion.length > 0 ? 
                            `<div class="recomendation-reasons" style="font-size: 0.8rem; color: #28a745; margin: 10px 0;">
                                <i class="fas fa-star"></i> ${razonesRecomendacion.join(' • ')}
                            </div>` : ''
                        }
                        <div class="room-price">S/ ${room.precioPorNoche} / noche</div>
                        <div class="room-actions">
                            <button class="btn" onclick="homeHuesped.reservarHabitacion('${room.id}')">
                                <i class="fas fa-calendar-check"></i> Reservar
                            </button>
                            <button class="btn btn-outline" onclick="homeHuesped.verDetalles('${room.id}')">
                                <i class="fas fa-info-circle"></i> Detalles
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    renderServices(services) {
        const container = document.getElementById('recommendations-container');
        if (!container) {
            console.log("❌ No se encontró el contenedor de servicios");
            return;
        }

        console.log("🎨 Renderizando servicios:", services.length);

        if (services.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-concierge-bell" style="font-size: 3rem; margin-bottom: 20px;"></i>
                    <h3>No se encontraron servicios</h3>
                    <p>Intenta ajustar tus filtros de búsqueda</p>
                </div>
            `;
            return;
        }

        let html = '';
        services.forEach(service => {
            const imagen = service.imagen || 'https://via.placeholder.com/250x150?text=Servicio';
            const categoria = this.categories.find(c => c.id === service.categoriaId);
            const recomendado = this.isServiceRecommended(service) ? '<div class="room-badge recomendada">RECOMENDADO</div>' : '';
            const destacado = service.destacado ? '<div class="room-badge destacado">DESTACADO</div>' : '';
            const esRecomendado = this.isServiceRecommended(service);
            
            const razonesRecomendacion = this.getServiceRecomendationReasons(service);
            const tooltipRecomendacion = razonesRecomendacion.length > 0 ? 
                `title="Recomendado porque: ${razonesRecomendacion.join(', ')}"` : '';
            
            html += `
                <div class="recommendation-card ${esRecomendado ? 'recomendada' : ''}" ${tooltipRecomendacion}>
                    <div class="recommendation-image">
                        <img src="${imagen}" alt="${service.nombre}" onerror="this.src='https://via.placeholder.com/250x150?text=Error+imagen'">
                        ${recomendado}
                        ${destacado}
                    </div>
                    <div class="recommendation-info">
                        <div class="recommendation-type">${categoria?.nombre || 'Servicio'}</div>
                        <h4>${this.escapeHtml(service.nombre)}</h4>
                        <p>${this.escapeHtml(service.descripcion)}</p>
                        <div class="service-details">
                            ${service.duracion ? `<span><i class="fas fa-clock"></i> ${service.duracion}</span>` : ''}
                            ${service.horario ? `<span><i class="fas fa-calendar-alt"></i> ${service.horario}</span>` : ''}
                        </div>
                        ${razonesRecomendacion.length > 0 ? 
                            `<div class="recomendation-reasons" style="font-size: 0.7rem; color: #28a745; margin: 8px 0;">
                                <i class="fas fa-star"></i> ${razonesRecomendacion.join(' • ')}
                            </div>` : ''
                        }
                        <div class="recommendation-price">S/ ${service.precio}</div>
                        <button class="btn btn-sm" onclick="homeHuesped.agregarServicio('${service.id}')">
                            <i class="fas fa-plus"></i> Agregar
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        console.log("✅ Servicios renderizados correctamente");
    }

    renderRoomTypeFilters() {
        const container = document.getElementById('room-type-filters');
        if (!container) return;

        const tiposUnicos = [...new Set(this.rooms.map(room => room.tipo))];
        
        let html = '';
        tiposUnicos.forEach(tipo => {
            html += `
                <label class="filter-checkbox">
                    <input type="checkbox" name="room-type" value="${tipo}">
                    ${tipo}
                </label>
            `;
        });
        
        container.innerHTML = html;
    }

    // Métodos de recomendación (se mantienen igual)
    isRoomRecommended(room) {
        if (!this.userPreferences || !this.userPreferences.habitaciones) return false;
        
        console.log("🔍 Evaluando habitación:", room.nombre);
        console.log("🎯 Preferencias del usuario:", this.userPreferences.habitaciones);
        
        const nivelPrecio = this.getComfortLevelPrice(room.precioPorNoche);
        const nivelPreferido = this.userPreferences.nivelComodidad;
        const nivelMatch = this.isComfortLevelMatch(nivelPrecio, nivelPreferido);
        
        console.log(`   💰 Nivel precio: ${nivelPrecio}, Preferido: ${nivelPreferido}, Match: ${nivelMatch}`);
        
        const preferenciasMatch = this.userPreferences.habitaciones.some(pref => {
            let match = false;
            
            console.log(`   🔎 Verificando preferencia: "${pref}"`);
            
            if (pref === 'vista-jardín') {
                match = room.vista && room.vista.toString().toLowerCase().includes('jardín');
                console.log(`   🌿 Buscando 'jardín' en vista: ${room.vista}, Resultado: ${match}`);
            }
            else if (pref === 'vista-mar') {
                match = room.vista && room.vista.toString().toLowerCase().includes('mar');
            }
            else if (pref === 'vista-ciudad') {
                match = room.vista && room.vista.toString().toLowerCase().includes('ciudad');
            }
            else if (pref === 'suite-lujo') {
                match = room.tipo && room.tipo.toLowerCase().includes('suite');
            }
            
            if (match) {
                console.log(`   ✅ Coincide con preferencia: ${pref}`);
            }
            
            return match;
        });

        const tipoViajeMatch = this.checkTravelTypeMatch(room, this.userPreferences.tipoViaje);
        
        const esRecomendada = nivelMatch || preferenciasMatch || tipoViajeMatch;
        console.log(`   🎯 Habitación ${room.nombre} recomendada: ${esRecomendada} (Nivel: ${nivelMatch}, Pref: ${preferenciasMatch}, Viaje: ${tipoViajeMatch})`);
        
        return esRecomendada;
    }

    isServiceRecommended(service) {
        if (!this.userPreferences || !this.userPreferences.servicios) return false;
        
        console.log("🔍 Evaluando servicio:", service.nombre);
        console.log("🎯 Preferencias de servicios:", this.userPreferences.servicios);
        
        const categoria = this.categories.find(c => c.id === service.categoriaId);
        const categoriaNombre = categoria?.nombre?.toLowerCase() || '';
        const servicioNombre = service.nombre.toLowerCase();
        const servicioDescripcion = service.descripcion ? service.descripcion.toLowerCase() : '';
        
        const esRecomendado = this.userPreferences.servicios.some(pref => {
            const preferencia = pref.toLowerCase();
            
            console.log(`   🔎 Verificando preferencia de servicio: "${preferencia}"`);
            
            if (servicioNombre.includes(preferencia)) {
                console.log(`   ✅ Coincide por nombre: ${preferencia} en ${servicioNombre}`);
                return true;
            }
            
            if (servicioDescripcion.includes(preferencia)) {
                console.log(`   ✅ Coincide por descripción: ${preferencia} en ${servicioDescripcion}`);
                return true;
            }
            
            if (categoriaNombre.includes(preferencia)) {
                console.log(`   ✅ Coincide por categoría: ${preferencia} en ${categoriaNombre}`);
                return true;
            }
            
            if (pref === 'restaurante') {
                const palabrasRestaurante = ['comida', 'almuerzo', 'cena', 'desayuno', 'buffet', 'gastronomía', 'restaurante', 'culinario', 'gourmet'];
                const encontrado = palabrasRestaurante.some(palabra => {
                    const resultado = servicioNombre.includes(palabra) || 
                                    servicioDescripcion.includes(palabra) ||
                                    categoriaNombre.includes(palabra);
                    if (resultado) {
                        console.log(`   ✅ Coincide por palabra clave: ${palabra}`);
                    }
                    return resultado;
                });
                
                if (encontrado) {
                    return true;
                }
            }
            
            return false;
        });

        console.log(`   🎯 Servicio ${service.nombre} recomendado: ${esRecomendado}`);
        return esRecomendado;
    }

    sortRoomsByRelevance(rooms) {
        return rooms.sort((a, b) => {
            const aRecomendada = this.isRoomRecommended(a);
            const bRecomendada = this.isRoomRecommended(b);
            
            if (aRecomendada && !bRecomendada) return -1;
            if (!aRecomendada && bRecomendada) return 1;
            
            if (aRecomendada && bRecomendada) {
                const aPreferenciaEspecifica = this.hasSpecificPreferenceMatch(a);
                const bPreferenciaEspecifica = this.hasSpecificPreferenceMatch(b);
                
                if (aPreferenciaEspecifica && !bPreferenciaEspecifica) return -1;
                if (!aPreferenciaEspecifica && bPreferenciaEspecifica) return 1;
            }
            
            const aDisponibles = a.unidadesDisponibles || 0;
            const bDisponibles = b.unidadesDisponibles || 0;
            
            return bDisponibles - aDisponibles;
        });
    }

    hasSpecificPreferenceMatch(room) {
        if (!this.userPreferences?.habitaciones) return false;
        
        return this.userPreferences.habitaciones.some(pref => {
            if (pref === 'vista-jardín') {
                return room.vista && room.vista.toString().toLowerCase().includes('jardín');
            }
            return false;
        });
    }

    getRecomendationReasons(room) {
        const razones = [];
        
        if (!this.userPreferences) return razones;
        
        const nivelPrecio = this.getComfortLevelPrice(room.precioPorNoche);
        if (this.isComfortLevelMatch(nivelPrecio, this.userPreferences.nivelComodidad)) {
            razones.push(`Nivel ${nivelPrecio} según sus preferencias`);
        }
        
        if (this.userPreferences.habitaciones) {
            this.userPreferences.habitaciones.forEach(pref => {
                if (pref === 'vista-jardín' && room.vista && room.vista.toString().toLowerCase().includes('jardín')) {
                    razones.push('Vista al jardín');
                }
                if (pref === 'vista-mar' && room.vista && room.vista.toString().toLowerCase().includes('mar')) {
                    razones.push('Vista al mar');
                }
            });
        }
        
        if (this.checkTravelTypeMatch(room, this.userPreferences.tipoViaje)) {
            razones.push(`Ideal para ${this.userPreferences.tipoViaje}`);
        }
        
        return razones;
    }

    getServiceRecomendationReasons(service) {
        const razones = [];
        
        if (!this.userPreferences?.servicios) return razones;
        
        this.userPreferences.servicios.forEach(pref => {
            const servicioNombre = service.nombre.toLowerCase();
            const servicioDescripcion = service.descripcion ? service.descripcion.toLowerCase() : '';
            const categoria = this.categories.find(c => c.id === service.categoriaId);
            const categoriaNombre = categoria?.nombre?.toLowerCase() || '';
            
            if (pref === 'restaurante') {
                const palabrasRestaurante = ['comida', 'almuerzo', 'cena', 'desayuno', 'buffet', 'gastronomía', 'restaurante'];
                const coincide = palabrasRestaurante.some(palabra => 
                    servicioNombre.includes(palabra) || 
                    servicioDescripcion.includes(palabra) ||
                    categoriaNombre.includes(palabra)
                );
                
                if (coincide) {
                    razones.push('Servicio de restaurante');
                }
            }
        });
        
        return razones;
    }

    checkTravelTypeMatch(room, tipoViaje) {
        if (!tipoViaje) return false;
        
        switch (tipoViaje) {
            case 'negocios':
                return (room.descripcion && (
                    room.descripcion.toLowerCase().includes('escritorio') ||
                    room.descripcion.toLowerCase().includes('trabajo') ||
                    room.descripcion.toLowerCase().includes('negocio')
                ));
            case 'vacaciones':
                return (room.vista && (room.vista.includes('mar') || room.vista.includes('jardín')));
            case 'romantico':
                return (room.tipo && room.tipo.toLowerCase().includes('suite'));
            case 'familiar':
                return room.capacidad >= 3;
            default:
                return false;
        }
    }

    getComfortLevelPrice(price) {
        if (price <= 150) return 'economico';
        if (price <= 250) return 'estandar';
        if (price <= 400) return 'superior';
        if (price <= 600) return 'lujo';
        return 'premium';
    }

    isComfortLevelMatch(roomLevel, userLevel) {
        const levels = ['economico', 'estandar', 'superior', 'lujo', 'premium'];
        const roomIndex = levels.indexOf(roomLevel);
        const userIndex = levels.indexOf(userLevel);
        
        if (roomIndex === -1 || userIndex === -1) return false;
        
        if (userLevel === 'premium') {
            return roomLevel === 'premium';
        }
        
        return roomIndex >= userIndex && roomLevel !== 'premium';
    }

    setDefaultDates() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const checkin = document.getElementById('checkin');
        const checkout = document.getElementById('checkout');
        
        if (checkin) {
            checkin.min = today.toISOString().split('T')[0];
            checkin.valueAsDate = today;
        }
        if (checkout) {
            checkout.min = tomorrow.toISOString().split('T')[0];
            checkout.valueAsDate = tomorrow;
        }
    }

    sortRooms(sortBy) {
        let sortedRooms = [...this.filteredRooms];
        
        switch (sortBy) {
            case 'price-asc':
                sortedRooms.sort((a, b) => a.precioPorNoche - b.precioPorNoche);
                break;
            case 'price-desc':
                sortedRooms.sort((a, b) => b.precioPorNoche - a.precioPorNoche);
                break;
            case 'name':
                sortedRooms.sort((a, b) => a.nombre.localeCompare(b.nombre));
                break;
            case 'capacidad':
                sortedRooms.sort((a, b) => b.capacidad - a.capacidad);
                break;
            case 'recomendadas-primero':
            default:
                break;
        }
        
        this.renderRooms(sortedRooms);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    verDetalles(roomId) {
        console.log("Ver detalles:", roomId);
        const room = this.rooms.find(r => r.id === roomId);
        if (room) {
            const detalles = `
Nombre: ${room.nombre}
Descripción: ${room.descripcion}
Precio: S/ ${room.precioPorNoche} por noche
Capacidad: ${room.capacidad} personas
Vista: ${room.vista}
Desayuno: ${room.incluyeDesayuno ? 'Incluido' : 'No incluido'}
Unidades disponibles: ${room.unidadesDisponibles}
            `;
            alert(detalles);
        }
    }
    showNotification(message) {
        const notification = document.getElementById('cart-notification');
        const notificationText = document.getElementById('notification-text');
        
        if (notification && notificationText) {
            notificationText.textContent = message;
            notification.classList.add('active');
            
            setTimeout(() => {
                notification.classList.remove('active');
            }, 3000);
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Inicializando HomeHuesped...");
    window.homeHuesped = new HomeHuesped();
    document.addEventListener("DOMContentLoaded", window.homeHuesped.actualizarEstadoBotonReserva);
    window.addEventListener("storage", window.homeHuesped.actualizarEstadoBotonReserva);
});