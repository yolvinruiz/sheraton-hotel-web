import { db, doc, getDoc } from "../firebase/config.js";

export const recomendacionesController = {

    carritoOpen: false,
    userName: "",
    carrito: [],   // aquí sí guardo cantidades

    async init() {
        await this.loadUserInfo();
        this.loadFromLocal();
        this.renderHeader();
        this.renderCarritoPanel();
    },

    /** ✅ Carga nombre del usuario */
    async loadUserInfo() {
        const uid = localStorage.getItem("loggedUserId");
        if (!uid) return;

        const snap = await getDoc(doc(db, "huespedes", uid));
        if (snap.exists()) {
            this.userName = snap.data().nombre;
        }
    },

    /** ✅ Recuperar carrito de localStorage */
    loadFromLocal() {
        this.carrito = JSON.parse(localStorage.getItem("aiSelectedServices")) || [];
        this.habitacionSeleccionada = localStorage.getItem("aiSelectedRoom") || null;
    },

    saveLocal() {
        localStorage.setItem("aiSelectedServices", JSON.stringify(this.carrito));
        if (this.habitacionSeleccionada)
            localStorage.setItem("aiSelectedRoom", this.habitacionSeleccionada);
    },

    /** ✅ Header con usuario y carrito */
renderHeader() {
  document.body.insertAdjacentHTML("afterbegin", `
    <div class="reco-header">
      <div class="user">👤 ${this.userName}</div>
      <div class="cart-icon" data-count="${this.carrito.length}" onclick="recomendacionesController.toggleCarrito()">🛒</div>
    </div>
  `);
},

    /** ✅ Panel de carrito vacío */
    renderCarritoPanel() {
        document.body.insertAdjacentHTML("beforeend", `
            <div id="carritoPanel" class="cart-panel">
                <button onclick="recomendacionesController.toggleCarrito()" style="float:right;">❌</button>
                <div class="cart-title">🛒 Tu carrito</div>
                <div id="cartItems"></div>
                <div class="cart-actions">
                    <button onclick="recomendacionesController.confirmReservation()">Reservar ahora</button>
                </div>
            </div>
        `);
    },

    /** ✅ Abrir / cerrar carrito */
    toggleCarrito() {
        this.carritoOpen = !this.carritoOpen;

        const panel = document.getElementById("carritoPanel");
        if (this.carritoOpen) {
            panel.classList.add("open");
            this.loadCarritoItems();
        } else {
            panel.classList.remove("open");
        }
    },

    /** ✅ Render de los items con botones + y - y eliminar */
async loadCarritoItems() {
  const div = document.getElementById("cartItems");

  if (this.carrito.length === 0) {
    div.innerHTML = "<p class='empty-cart'>No hay servicios en el carrito.</p>";
    return;
  }

  div.innerHTML = "<p>Cargando...</p>";

  let html = "";

  for (let item of this.carrito) {
    const snap = await getDoc(doc(db, "servicios", item.id));
    if (!snap.exists()) continue;

    const s = snap.data();

    html += `
      <div class="cart-item">
        <div class="cart-item-info">
          <strong>${s.nombre}</strong>
          <p class="cart-item-desc">${s.descripcion}</p>
          <span class="cart-item-price">S/ ${s.precio}</span>
        </div>
        <div class="cart-item-controls">
          <button class="btn-qty" onclick="recomendacionesController.modifyQty('${item.id}', -1)">➖</button>
          <span class="qty-display">${item.qty}</span>
          <button class="btn-qty" onclick="recomendacionesController.modifyQty('${item.id}', 1)">➕</button>
          <button class="btn-remove" onclick="recomendacionesController.removeItem('${item.id}')">🗑</button>
        </div>
      </div>
    `;
  }

  div.innerHTML = html;
  
  // Actualizar contador del header
  this.updateCartHeader();
},
updateCartHeader() {
  const cartCount = this.carrito.reduce((total, item) => total + item.qty, 0);
  const cartIcon = document.querySelector('.cart-icon');
  if (cartIcon) {
    cartIcon.setAttribute('data-count', cartCount);
  }
},

    /** ✅ Agregar servicio (con qty) */
    agregarServicio(id) {
        let existing = this.carrito.find(s => s.id === id);

        if (existing) {
            existing.qty++;
        } else {
            this.carrito.push({ id, qty: 1 });
        }

        this.saveLocal();
        alert("✅ Servicio agregado al carrito");
        this.loadCarritoItems();
    },

    /** ✅ Nuevo: reservarHabitacion (igual a homeHuesped) */
    reservarHabitacion(id) {
    this.seleccionarHabitacion(id);
},

    /** ✅ También mantener seleccionarHabitacion por compatibilidad */
    seleccionarHabitacion(id) {
    sessionStorage.setItem("habitacionSeleccionada", id);
    this.habitacionSeleccionada = id;
    alert("✅ Habitación seleccionada");
},
    /** ✅ Modificar cantidad */
    modifyQty(id, amount) {
        const item = this.carrito.find(s => s.id === id);
        if (!item) return;

        item.qty += amount;

        if (item.qty <= 0) {
            this.removeItem(id);
            return;
        }

        this.saveLocal();
        this.loadCarritoItems();
    },

    /** ✅ Eliminar servicio */
    removeItem(id) {
        this.carrito = this.carrito.filter(s => s.id !== id);
        this.saveLocal();
        this.loadCarritoItems();
    },

    /** ✅ Confirmar reserva → redirigir a reservas.html */
confirmReservation() {

    const habitacionSeleccionada = sessionStorage.getItem('habitacionSeleccionada');

    if (!habitacionSeleccionada) {
        alert("⚠️ Debes seleccionar una habitación primero.");
        return;
    }

    if (this.carrito.length === 0) {
        alert("⚠️ Debes elegir por lo menos 1 servicio.");
        return;
    }

    // Guardar origen IA por si reservas.html necesita saber
    sessionStorage.setItem("fromIa", "1");

    // Redirigir con ID real de habitación
    window.location.href = `/reserva.html?habitacion=${habitacionSeleccionada}`;
}
};

// ✅ Exponer global
window.recomendacionesController = recomendacionesController;
