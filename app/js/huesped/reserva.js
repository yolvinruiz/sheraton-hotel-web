// js/huesped/reserva.js
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, collection, getDocs, addDoc, updateDoc, arrayUnion,
  query, where
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { app } from '../firebase/config.js';

const auth = getAuth(app);
const db = getFirestore(app);

class Reserva {
  constructor() {
    // datos básicos
    this.roomTipo = null;         // documento de tipoHabitacion (lo que obtuviste via ?habitacion=TIPO_ID)
    this.unidades = [];           // unidades disponibles (unidadesHabitacion)
    this.unidadSeleccionada = null; // objeto unidad { id, numero, piso, estado, tipoId ... }
    this.services = [];
    this.selectedServices = [];   // [{ servicio: {...}, cantidad: n }]
    this.roomTipoId = this.getRoomIdFromUrl();
    this.user = null;
    this.userData = null;

    // calendario
    this.today = this.clearTime(new Date());
    this.viewYear = this.today.getFullYear();
    this.viewMonth = this.today.getMonth();
    this.selectedCheckin = null;
    this.selectedCheckout = null;
    this.bookedDatesSet = new Set();

    this.totalNights = 0;

    this.init();
  }

  getRoomIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('habitacion'); // aquí envías tipoHabitacion id
  }

  async init() {
    onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = '/index.html'; return; }
      this.user = user;
      await this.loadUserData(user.uid);
      await this.loadRoomTipo();
      await this.loadUnidadesDisponibles(); // carga unidades del tipo
      await this.loadServices();
      this.bindEvents();
      this.renderRoomInfo();
      this.renderUnidades();
      this.renderCalendar();
      this.loadReservationDataFromSession(); // compatibilidad previa
      this.renderSelectedServices();
      this.calculateTotal();
    });
  }

  async loadUserData(uid) {
    try {
      const snap = await getDoc(doc(db, 'huespedes', uid));
      if (snap.exists()) {
        this.userData = snap.data();
        document.getElementById('card-email').value = this.userData.email || '';
      }
    } catch (e) { console.error('loadUserData', e); }
  }

  async loadRoomTipo() {
    if (!this.roomTipoId) return;
    try {
      const snap = await getDoc(doc(db, 'tiposHabitacion', this.roomTipoId));
      if (snap.exists()) { this.roomTipo = { id: snap.id, ...snap.data() }; }
    } catch (e) { console.error('loadRoomTipo', e); }
  }

  async loadUnidadesDisponibles() {
    // traer unidades donde tipoId == roomTipoId y estado == 'disponible'
    try {
      const unidadesRef = collection(db, 'unidadesHabitacion');
      const q = query(unidadesRef, where('tipoId', '==', this.roomTipoId));
      const snapshot = await getDocs(q);
      this.unidades = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.estado === 'disponible' || u.estado === 'Disponible' || u.estado === 'LIBRE' || u.estado === 'libre');
      // si no hay disponibles, aún mostramos todas (para admin/testing)
      if (this.unidades.length === 0) {
        // opcional: mostrar unidades aunque no estén en 'disponible'
        this.unidades = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (e) { console.error('loadUnidadesDisponibles', e); }
  }

  async loadServices() {
    try {
      const snapshot = await getDocs(collection(db, 'servicios'));
      this.services = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { console.error('loadServices', e); }
  }

  bindEvents() {
    document.getElementById('prev-month')?.addEventListener('click', () => { this.viewMonth--; if (this.viewMonth<0){ this.viewMonth=11; this.viewYear--; } this.renderCalendar(); });
    document.getElementById('next-month')?.addEventListener('click', () => { this.viewMonth++; if (this.viewMonth>11){ this.viewMonth=0; this.viewYear++; } this.renderCalendar(); });
    document.getElementById('clear-selection')?.addEventListener('click', () => { this.selectedCheckin=null; this.selectedCheckout=null; this.totalNights=0; this.applySelectionToUI(); this.renderCalendar(); });
    document.getElementById('btn-open-services')?.addEventListener('click', () => this.openServicesModal());
    document.getElementById('cerrar-modal')?.addEventListener('click', () => this.closeServicesModal());
    document.getElementById('cancelar-servicios')?.addEventListener('click', () => this.closeServicesModal());
    document.getElementById('confirmar-servicios')?.addEventListener('click', () => this.confirmSelectedServices());
    document.getElementById('btn-confirmar-pago')?.addEventListener('click', (e) => { e.preventDefault(); this.processPayment(); });
  }

  renderRoomInfo() {
    if (!this.roomTipo) return;
    document.getElementById('room-image').src = this.roomTipo.imagen || 'https://via.placeholder.com/150x100?text=Habitación';
    document.getElementById('room-name').textContent = this.roomTipo.nombre || 'Habitación';
    document.getElementById('room-description').textContent = this.roomTipo.descripcion || '';
    document.getElementById('room-price').textContent = `S/ ${this.roomTipo.precioPorNoche} / noche`;
  }

  renderUnidades() {
    const container = document.getElementById('unidades-container');
    container.innerHTML = '';
    if (!this.unidades || this.unidades.length === 0) {
      container.innerHTML = '<p class="small">No hay unidades registradas para este tipo.</p>';
      return;
    }
    this.unidades.forEach(u => {
      const card = document.createElement('div');
      card.className = 'unidad-card';
      card.dataset.unidadId = u.id;
      card.innerHTML = `<div style="font-weight:600">Nº ${u.numero || '—'}</div><div class="small">Piso ${u.piso || '-'}</div>`;
      card.addEventListener('click', async () => {
        // seleccionar/des-seleccionar
        // quitar selección antigua
        document.querySelectorAll('.unidad-card').forEach(el => el.classList.remove('selected'));
        card.classList.add('selected');
        // set unidadSeleccionada
        this.unidadSeleccionada = u;
        // guardar en sessionStorage para compatibilidad
        sessionStorage.setItem('unidadSeleccionada', u.id);
        // cargar reservas solo de esta unidad
        await this.fetchBookedDatesForUnidad(u.id);
        // limpiar selección de fechas previa
        this.selectedCheckin = null;
        this.selectedCheckout = null;
        this.applySelectionToUI();
        this.renderCalendar();
      });
      container.appendChild(card);
    });
    document.getElementById('unidades-loading')?.remove();
  }

  async fetchBookedDatesForUnidad(unidadId) {
    this.bookedDatesSet.clear();
    if (!unidadId) return;
    try {
      const reservasRef = collection(db, 'reservas');
      // asumimos que en las reservas guardas una propiedad unidadId (o habitacionId para unidad) - comprobamos ambas
      const q1 = query(reservasRef, where('unidadId', '==', unidadId));
      const q2 = query(reservasRef, where('habitacionId', '==', unidadId));
      const snaps1 = await getDocs(q1);
      snaps1.forEach(snap => {
        const r = snap.data();
        if (r.checkin && r.checkout) {
          const arr = this.getDatesBetween(new Date(r.checkin + 'T00:00:00'), new Date(r.checkout + 'T00:00:00'));
          arr.forEach(d => this.bookedDatesSet.add(d));
        }
      });
      // also try q2 if q1 returned none
      const snaps2 = await getDocs(q2);
      snaps2.forEach(snap => {
        const r = snap.data();
        if (r.checkin && r.checkout) {
          const arr = this.getDatesBetween(new Date(r.checkin + 'T00:00:00'), new Date(r.checkout + 'T00:00:00'));
          arr.forEach(d => this.bookedDatesSet.add(d));
        }
      });
      console.log('bookedDates for unidad', unidadId, this.bookedDatesSet);
    } catch (e) { console.error('fetchBookedDatesForUnidad', e); }
  }

  // Calendar rendering
  renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    const monthTitle = document.getElementById('month-title');
    if (!calendarEl || !monthTitle) return;

    // headers
    const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    calendarEl.innerHTML = '';
    for (const dn of dayNames) {
      const el = document.createElement('div');
      el.className = 'day-name';
      el.textContent = dn;
      calendarEl.appendChild(el);
    }

    monthTitle.textContent = `${this.getMonthName(this.viewMonth)} ${this.viewYear}`;

    const firstOfMonth = new Date(this.viewYear, this.viewMonth, 1);
    const startWeekDay = firstOfMonth.getDay();
    const startDate = new Date(this.viewYear, this.viewMonth, 1 - startWeekDay);
    const totalCells = 42;

    for (let i = 0; i < totalCells; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const iso = this.formatISODate(this.clearTime(d));
      const isOther = d.getMonth() !== this.viewMonth;
      const isPast = this.clearTime(d) < this.clearTime(this.today);
      const isBooked = this.bookedDatesSet.has(iso);
      const isSelected = this.isDateSelected(d);
      const isInRange = this.isDateInSelectedRange(d);

      const div = document.createElement('div');
      div.className = 'day';
      if (isOther) div.classList.add('other-month');
      if (isPast) div.classList.add('past');
      if (isBooked) div.classList.add('booked');
      if (isSelected) div.classList.add('selected');
      if (isInRange) div.classList.add('in-range');

      div.dataset.date = iso;
      div.textContent = d.getDate();

      div.addEventListener('click', () => {
        if (isPast || isBooked) return;
        // require unidad seleccionada first
        if (!this.unidadSeleccionada) {
          this.showNotification('Selecciona primero la habitación concreta (unidad).');
          return;
        }
        this.handleDateClick(this.clearTime(d));
      });

      calendarEl.appendChild(div);
    }
  }

  handleDateClick(dateObj) {
    // if no checkin -> set checkin
    if (!this.selectedCheckin || (this.selectedCheckin && this.selectedCheckout)) {
      this.selectedCheckin = dateObj;
      this.selectedCheckout = null;
      this.applySelectionToUI();
      this.renderCalendar();
      return;
    }
    // set checkout (must be > checkin)
    if (dateObj <= this.selectedCheckin) {
      // treat as new start
      this.selectedCheckin = dateObj;
      this.selectedCheckout = null;
      this.applySelectionToUI();
      this.renderCalendar();
      return;
    }
    // check availability for range [checkin, checkout)
    const ok = this.isRangeAvailable(this.selectedCheckin, dateObj);
    if (!ok) { this.showNotification('El rango contiene días ocupados. Elige otro rango.'); return; }
    this.selectedCheckout = dateObj;
    this.applySelectionToUI();
    this.renderCalendar();
    this.calculateTotal();
  }

  isDateSelected(dateObj) {
    if (!this.selectedCheckin) return false;
    const iso = this.formatISODate(this.clearTime(dateObj));
    if (this.selectedCheckout) {
      return iso === this.formatISODate(this.selectedCheckin) || iso === this.formatISODate(this.selectedCheckout);
    }
    return iso === this.formatISODate(this.selectedCheckin);
  }

  isDateInSelectedRange(dateObj) {
    if (!this.selectedCheckin || !this.selectedCheckout) return false;
    const d = this.clearTime(dateObj).getTime();
    const s = this.clearTime(this.selectedCheckin).getTime();
    const e = this.clearTime(this.selectedCheckout).getTime();
    return d > s && d < e;
  }

  isRangeAvailable(startDate, endDate) {
    // startDate inclusive, endDate exclusive
    if (!startDate || !endDate) return false;
    const dates = this.getDatesBetween(startDate, endDate);
    return dates.every(d => !this.bookedDatesSet.has(d));
  }

  // services modal behavior (RESTORED)
  openServicesModal() {
    const modal = document.getElementById('modal-servicios');
    const container = document.getElementById('servicios-disponibles');
    container.innerHTML = '';
    // create card + hidden checkbox for each service
    this.services.forEach(s => {
      const selected = this.selectedServices.some(it => it.servicio.id === s.id);
      const card = document.createElement('div');
      card.className = 'servicio-card' + (selected ? ' selected' : '');
      card.innerHTML = `
        <div style="font-weight:700">${this.escapeHtml(s.nombre)}</div>
        <div style="font-size:.9rem; color:#666">${this.escapeHtml(s.descripcion || '')}</div>
        <div style="font-weight:600; color:var(--secondary)">S/ ${s.precio}</div>
        <input type="checkbox" style="display:none" value="${s.id}" ${selected ? 'checked' : ''}>
      `;
      card.addEventListener('click', () => {
        card.classList.toggle('selected');
        const cb = card.querySelector('input[type="checkbox"]');
        cb.checked = !cb.checked;
      });
      container.appendChild(card);
    });
    this.renderServiciosSeleccionadosModal();
    modal.style.display = 'flex';

  }

  closeServicesModal() { document.getElementById('modal-servicios').style.display = 'none'; }

  confirmSelectedServices() {
    const checked = document.querySelectorAll('#servicios-disponibles input[type="checkbox"]:checked');
    // build selectedServices as { servicio, cantidad:1 }
    this.selectedServices = Array.from(checked).map(ch => {
      const id = ch.value;
      const serv = this.services.find(s => s.id === id);
      return { servicio: serv, cantidad: 1 };
    });
    // persist in localStorage same key you used elsewhere
    localStorage.setItem('carritoServicios', JSON.stringify(this.selectedServices));
    this.renderSelectedServices();
    this.closeServicesModal();
    this.showNotification('Servicios actualizados correctamente');
  }

renderSelectedServices() {
    const container = document.getElementById('servicios-lista');
    container.innerHTML = '';

    if (!this.selectedServices || this.selectedServices.length === 0) {
        container.innerHTML = '<p class="small">No hay servicios agregados</p>';
        return;
    }

    this.selectedServices.forEach(item => {

        const div = document.createElement('div');
        div.className = 'servicio-item';

        div.innerHTML = `
            <div style="flex:1;">
                <strong>${item.servicio.nombre}</strong><br>
                <small style="color:#666">${item.servicio.descripcion || ""}</small>
            </div>

            <div class="controls">
                <button class="btn-cantidad"
                    onclick="disminuirCantidadServicio('${item.servicio.id}')">−</button>

                <span id="cantidad-servicio-${item.servicio.id}" class="cantidad-servicio">
                    ${item.cantidad}
                </span>

                <button class="btn-cantidad"
                    onclick="aumentarCantidadServicio('${item.servicio.id}')">+</button>

                <button class="btn-eliminar"
                    onclick="eliminarServicio('${item.servicio.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>

            <div style="font-weight:bold;">
                S/ ${(item.servicio.precio * item.cantidad).toFixed(2)}
            </div>
        `;

        container.appendChild(div);
    });

    this.calculateTotal();
}

  // Payment & save
  async processPayment() {
    // validations
    if (!this.unidadSeleccionada) { this.showError('Selecciona primero una habitación concreta (unidad)'); return; }
    if (!this.selectedCheckin || !this.selectedCheckout) { this.showError('Selecciona check-in y check-out'); return; }
    if (!this.validatePaymentForm()) return;

    // Double-check availability (race condition)
    await this.fetchBookedDatesForUnidad(this.unidadSeleccionada.id);
    if (!this.isRangeAvailable(this.selectedCheckin, this.selectedCheckout)) {
      this.showError('Fechas ya no disponibles. Elige otras fechas.');
      this.renderCalendar();
      return;
    }

    try {
      const reserva = {
        tipoHabitacionId: this.roomTipoId,
        habitacionNombre: this.roomTipo?.nombre || '',
        unidadId: this.unidadSeleccionada.id,
        unidadNumero: this.unidadSeleccionada.numero || '',
        habitacionPrecio: this.roomTipo?.precioPorNoche || 0,
        huespedId: this.user.uid,
        huespedNombre: `${this.userData?.nombre || ''} ${this.userData?.apellidos || ''}`.trim(),
        huespedEmail: this.userData?.email || document.getElementById('card-email').value,
        checkin: this.formatISODate(this.selectedCheckin),
        checkout: this.formatISODate(this.selectedCheckout),
        noches: this.totalNights,
        servicios: this.selectedServices,
        total: this.calculateTotal(),
        estado: 'confirmada',
        metodoPago: {
          tipo: 'tarjeta',
          ultimosDigitos: (document.getElementById('card-number').value || '').slice(-4),
          email: document.getElementById('card-email').value
        },
        fechaReserva: new Date(),
        fechaCreacion: new Date(),
        codigoReserva: this.generateReservationCode()
      };

      const docRef = await addDoc(collection(db, 'reservas'), reserva);
      console.log('Reserva guardada ID:', docRef.id);

      // update user profile
      await this.updateUserProfile(docRef.id, reserva);

      // mark booked dates locally so calendar updates immediately
      const added = this.getDatesBetween(new Date(reserva.checkin + 'T00:00:00'), new Date(reserva.checkout + 'T00:00:00'));
      added.forEach(d => this.bookedDatesSet.add(d));
      // clear selection
      this.selectedCheckin = null; this.selectedCheckout = null; this.totalNights = 0;
      this.applySelectionToUI();
      this.renderCalendar();

      // clear storages
      localStorage.removeItem('carritoServicios');
      sessionStorage.removeItem('carritoServicios');
      sessionStorage.removeItem('checkin');
      sessionStorage.removeItem('checkout');
      sessionStorage.removeItem('habitacionSeleccionada');
      sessionStorage.removeItem('unidadSeleccionada');

      this.showSuccess(reserva.codigoReserva);

    } catch (e) {
      console.error('processPayment error', e);
      this.showError('Error al procesar la reserva. Intenta nuevamente.');
    }
  }

  async updateUserProfile(reservaId, reserva) {
    try {
      const userRef = doc(db, 'huespedes', this.user.uid);
      await updateDoc(userRef, {
        'historial.reservasRealizadas': arrayUnion({
          reservaId, codigoReserva: reserva.codigoReserva, habitacion: reserva.habitacionNombre,
          unidadNumero: reserva.unidadNumero, fechaReserva: reserva.fechaReserva,
          checkin: reserva.checkin, checkout: reserva.checkout, total: reserva.total, estado: reserva.estado
        }),
        'historial.reservas': (this.userData?.historial?.reservas || 0) + 1,
        'historial.ultimaVisita': new Date(),
        'historial.serviciosUtilizados': arrayUnion(...(reserva.servicios || []).map(s => s.servicio?.nombre || s.nombre || '')),
        updatedAt: new Date()
      });
    } catch (e) { console.error('updateUserProfile', e); }
  }

  // helpers
  validatePaymentForm() {
    const cardNumber = (document.getElementById('card-number')?.value || '').replace(/\s+/g,'');
    const cardExpiry = document.getElementById('card-expiry')?.value || '';
    const cardCvv = document.getElementById('card-cvv')?.value || '';
    const cardName = document.getElementById('card-name')?.value || '';
    const cardEmail = document.getElementById('card-email')?.value || '';
    if (!/^\d{12}$/.test(cardNumber)) { this.showError('El número de tarjeta debe tener exactamente 12 dígitos'); return false; }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) { this.showError('La fecha de vencimiento debe tener formato MM/AA'); return false; }
    if (!/^\d{3}$/.test(cardCvv)) { this.showError('El CVV debe tener 3 dígitos'); return false; }
    if (cardName.trim().length < 3) { this.showError('Ingresa el nombre en la tarjeta'); return false; }
    if (!/^\S+@\S+\.\S+$/.test(cardEmail)) { this.showError('Ingresa un email válido'); return false; }
    return true;
  }

  getDatesBetween(startDate, endDate) {
    const arr = []; let cur = new Date(startDate);
    while (this.clearTime(cur) < this.clearTime(endDate)) {
      arr.push(this.formatISODate(this.clearTime(cur)));
      cur.setDate(cur.getDate() + 1);
    }
    return arr;
  }

  formatISODate(d) {
    const y = d.getFullYear(); const m = `${d.getMonth()+1}`.padStart(2,'0'); const day = `${d.getDate()}`.padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  formatNiceDate(d) { return d.toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' }); }
  getMonthName(i) { return new Date(2020,i,1).toLocaleString('es-ES', { month:'long' }).replace(/^./, s => s.toUpperCase()); }
  clearTime(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
  generateReservationCode(){ const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let code='SH-'; for(let i=0;i<6;i++) code+=chars.charAt(Math.floor(Math.random()*chars.length)); return code; }
  showNotification(msg){ const n=document.getElementById('notification'), nt=document.getElementById('notification-text'); if(!n||!nt) return; nt.textContent=msg; n.style.display='block'; setTimeout(()=> n.style.display='none',3000); }
  showError(msg){ alert(`Error: ${msg}`); }
  showSuccess(code){ const html = `<div style="text-align:center;padding:20px;"><i class="fas fa-check-circle" style="font-size:4rem;color:#28a745;"></i><h2 style="color:var(--primary)">¡Reserva Confirmada!</h2><p>Código: <strong>${code}</strong></p><div style="display:flex;gap:10px;justify-content:center;margin-top:12px;"><button class="btn" onclick="window.location.href='/huesped/huesped.html'"><i class="fas fa-home"></i> Inicio</button><button class="btn btn-outline" onclick="window.location.href='/huesped/historial.html'"><i class="fas fa-history"></i> Ver historial</button></div></div>`; document.querySelector('.reserva-container').innerHTML = html; }

  applySelectionToUI() {
    if (this.selectedCheckin) document.getElementById('checkin-date').textContent = this.formatNiceDate(this.selectedCheckin); else document.getElementById('checkin-date').textContent = '—';
    if (this.selectedCheckout) {
      document.getElementById('checkout-date').textContent = this.formatNiceDate(this.selectedCheckout);
      const diff = Math.ceil((this.clearTime(this.selectedCheckout) - this.clearTime(this.selectedCheckin)) / (1000*60*60*24));
      this.totalNights = diff;
      document.getElementById('total-nights').textContent = diff;
      document.getElementById('nights-count').textContent = diff;
    } else {
      document.getElementById('checkout-date').textContent = '—';
      this.totalNights = 0;
      document.getElementById('total-nights').textContent = 0;
      document.getElementById('nights-count').textContent = 0;
    }
    this.calculateTotal();
  }

  loadReservationDataFromSession() {
    const sc = sessionStorage.getItem('checkin'), so = sessionStorage.getItem('checkout'), u = sessionStorage.getItem('unidadSeleccionada');
    if (u) {
      const found = this.unidades.find(x => x.id === u);
      if (found) {
        this.unidadSeleccionada = found;
        // mark selected card
        document.querySelectorAll('.unidad-card').forEach(el => { if (el.dataset.unidadId === u) el.classList.add('selected'); else el.classList.remove('selected');});
        // fetch booked dates for unidad
        this.fetchBookedDatesForUnidad(u).then(()=> this.renderCalendar());
      }
    }
    if (sc && so) {
      const ci = new Date(sc + 'T00:00:00'), co = new Date(so + 'T00:00:00');
      // ensure availability
      if (this.isRangeAvailable(ci, co)) {
        this.selectedCheckin = ci; this.selectedCheckout = co; this.applySelectionToUI();
      } else {
        // no disponible -> limpiar
        this.selectedCheckin = null; this.selectedCheckout = null;
      }
    }
    // load services from storage if any
    const carrito = localStorage.getItem('carritoServicios');
    if (carrito) {
      try {
        const parsed = JSON.parse(carrito);
        // ensure structure { servicio, cantidad }
        this.selectedServices = parsed.map(p => {
          if (p.servicio) return p;
          const serv = this.services.find(s => s.id === p.id) || p;
          return { servicio: serv, cantidad: p.cantidad || 1 };
        });
      } catch(e){ console.error('parse carrito', e); }
    }
  }
aumentarCantidadServicio(id) {
    this.actualizarCantidadServicioEnModal(id, 1);
}
renderServiciosSeleccionadosModal() {
    const cont = document.getElementById("lista-servicios-modal");
    if (!cont) return;

    cont.innerHTML = "";

    if (!this.selectedServices || this.selectedServices.length === 0) {
        cont.innerHTML = `<p class="small">No hay servicios seleccionados</p>`;
        return;
    }

    this.selectedServices.forEach(item => {
        const div = document.createElement("div");
        div.className = "servicio-item";
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";
        div.style.marginBottom = "8px";

        div.innerHTML = `
            <div>
                <strong>${item.servicio.nombre}</strong><br>
                <small>${item.servicio.descripcion || ""}</small>
            </div>

            <div style="display:flex; align-items:center; gap:10px;">
                <button class="btn btn-outline" onclick="disminuirCantidadServicio('${item.servicio.id}')">−</button>
                <span>${item.cantidad}</span>
                <button class="btn btn-outline" onclick="aumentarCantidadServicio('${item.servicio.id}')">+</button>
            </div>

            <div style="font-weight:bold;">
                S/ ${(item.servicio.precio * item.cantidad).toFixed(2)}
            </div>
        `;

        cont.appendChild(div);
    });
}
eliminarServicio(id) {
    this.selectedServices = this.selectedServices.filter(s => s.servicio.id !== id);

    localStorage.setItem("carritoServicios", JSON.stringify(this.selectedServices));

    this.renderSelectedServices();
    this.renderServiciosSeleccionadosModal();
    this.calculateTotal();
}
actualizarCantidadServicioEnLista(id, delta) {
    const item = this.selectedServices.find(s => s.servicio.id === id);
    if (!item) return;

    item.cantidad += delta;
    if (item.cantidad <= 0) {
        this.selectedServices = this.selectedServices.filter(s => s.servicio.id !== id);
    }

    // ✅ Actualizar número en pantalla
    const span = document.getElementById(`cantidad-servicio-${id}`);
    if (span) span.textContent = item.cantidad;

    // ✅ Guardar y actualizar totales
    localStorage.setItem("carritoServicios", JSON.stringify(this.selectedServices));
    this.renderSelectedServices();
    this.calculateTotal();
}
actualizarCantidadServicioEnModal(id, delta) {
    const item = this.selectedServices.find(s => s.servicio.id === id);
    if (!item) return;

    item.cantidad += delta;

    if (item.cantidad <= 0) {
        // eliminar del array
        this.selectedServices = this.selectedServices.filter(s => s.servicio.id !== id);
    }

    // guardar
    localStorage.setItem('carritoServicios', JSON.stringify(this.selectedServices));

    // refrescar modal y lista fuera
    this.renderServiciosSeleccionadosModal();
    this.renderSelectedServices();
    this.calculateTotal();
}
// Disminuir cantidad dentro del modal
 disminuirCantidadServicio(id) {
    this.actualizarCantidadServicioEnModal(id, -1);
}
  calculateTotal() {
    const nights = this.totalNights || 0;
    const roomSubtotal = (this.roomTipo?.precioPorNoche || 0) * nights;
    const servicesSubtotal = (this.selectedServices || []).reduce((acc, it) => acc + (it.servicio?.precio || 0) * (it.cantidad || 1), 0);
    const total = roomSubtotal + servicesSubtotal;
    document.getElementById('subtotal-habitacion').textContent = `S/ ${roomSubtotal}`;
    document.getElementById('subtotal-servicios').textContent = `S/ ${servicesSubtotal}`;
    document.getElementById('total-pagar').textContent = `S/ ${total}`;
    return total;
  }

  escapeHtml(s){ if(!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
window.aumentarCantidadServicio = (id) => reserva.actualizarCantidadServicioEnLista(id, 1);
window.disminuirCantidadServicio = (id) => reserva.actualizarCantidadServicioEnLista(id, -1);
window.eliminarServicio = (id) => reserva.eliminarServicio(id);
document.addEventListener('DOMContentLoaded', () => { window.reserva = new Reserva(); });

