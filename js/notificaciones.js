/* ════════════════════════════════════════════
   RJTechEdu — notificaciones.js
   Campana de notificaciones reutilizable para
   Panel Docente y Panel Estudiante.
   ════════════════════════════════════════════ */

let _notifTodas = [];
let _notifLeidasIds = new Set();
let _notifUserId = null;

async function initCampanaNotificaciones(rolActual) {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;
  _notifUserId = user.id;

  // Inyectar el botón campana: lo ponemos en el topbar-mobile (para vista celular)
  // y también flotante fijo arriba a la derecha (para que se vea en computadora).
  if (!document.getElementById("btnCampanaNotif")) {
    const btn = document.createElement("button");
    btn.id = "btnCampanaNotif";
    btn.className = "btn-campana-notif btn-campana-flotante";
    btn.innerHTML = `<i class="fas fa-bell"></i><span id="puntoNotif" class="punto-notif oculto"></span>`;
    document.body.appendChild(btn);

    const panel = document.createElement("div");
    panel.id = "panelNotif";
    panel.className = "panel-notif oculto";
    panel.innerHTML = `
      <div class="panel-notif-header">
        <strong><i class="fas fa-bell"></i> Notificaciones</strong>
        <button id="btnCerrarPanelNotif" class="btn-icono"><i class="fas fa-times"></i></button>
      </div>
      <div id="listaNotif" class="panel-notif-lista"></div>`;
    document.body.appendChild(panel);

    btn.addEventListener("click", () => {
      panel.classList.toggle("oculto");
    });
    document.getElementById("btnCerrarPanelNotif")?.addEventListener("click", () => {
      panel.classList.add("oculto");
    });
  }

  await cargarNotificaciones(rolActual);
}

async function cargarNotificaciones(rolActual) {
  const { data: notifs } = await supabaseClient
    .from("notificaciones").select("*")
    .or(`rol_destino.eq.todos,rol_destino.eq.${rolActual}`)
    .order("creado_at", { ascending: false })
    .limit(30);

  const { data: leidas } = await supabaseClient
    .from("notificaciones_leidas").select("notificacion_id")
    .eq("usuario_id", _notifUserId);

  _notifLeidasIds = new Set((leidas || []).map(l => l.notificacion_id));
  _notifTodas = notifs || [];
  renderNotificaciones();
}

function renderNotificaciones() {
  const lista = document.getElementById("listaNotif");
  const punto = document.getElementById("puntoNotif");
  if (!lista) return;

  const sinLeer = _notifTodas.filter(n => !_notifLeidasIds.has(n.id));
  if (punto) punto.classList.toggle("oculto", sinLeer.length === 0);

  if (_notifTodas.length === 0) {
    lista.innerHTML = `<p class="sin-datos" style="padding:1rem;">Sin notificaciones por ahora.</p>`;
    return;
  }

  lista.innerHTML = _notifTodas.map(n => {
    const noLeida = !_notifLeidasIds.has(n.id);
    return `
      <div class="item-notif ${noLeida ? 'no-leida' : ''}" onclick="marcarNotifLeida('${n.id}')">
        <strong>${n.titulo}</strong>
        <p>${n.mensaje || ""}</p>
        <span class="item-notif-fecha">${formatFecha ? formatFecha(n.creado_at) : new Date(n.creado_at).toLocaleDateString()}</span>
      </div>`;
  }).join("");
}

window.marcarNotifLeida = async function(notifId) {
  if (_notifLeidasIds.has(notifId)) return;
  _notifLeidasIds.add(notifId);
  renderNotificaciones();
  await supabaseClient.from("notificaciones_leidas").insert({
    notificacion_id: notifId, usuario_id: _notifUserId
  });
};
