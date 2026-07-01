/* ════════════════════════════════════════════
   RJTechEdu — panel_admin.js
   ════════════════════════════════════════════ */

let todosUsuarios = [];
let todosCursos   = [];

window.addEventListener("DOMContentLoaded", async () => {
  await verificarSesion();
  await cargarPerfilAdmin();
  await cargarEstadisticas();
  await cargarUsuarios();
  await cargarCursosAdmin();
  await cargarSolicitudesPendientes();
  initNav();
  initSidebar();
  initCerrarSesion();
  initExportarCSV();
  initEnviarNotif();
});

// ══ SESIÓN ════════════════════════════════════════════════════════════════════
async function verificarSesion() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = "/index.html"; return; }

  const { data: perfil } = await supabaseClient
    .from("perfiles").select("rol").eq("user_id", session.user.id).single();

  if (!perfil || perfil.rol !== "administrador") {
    window.location.href = "/index.html";
  }
}

// ══ PERFIL SIDEBAR ════════════════════════════════════════════════════════════
async function cargarPerfilAdmin() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: perfil } = await supabaseClient
    .from("perfiles").select("*").eq("user_id", user.id).single();

  if (!perfil) return;

  const sideNombre = document.getElementById("sideNombre");
  if (sideNombre) sideNombre.textContent = `${perfil.nombre} ${perfil.apellido}`;

  const saludoH1 = document.getElementById("saludoH1");
  if (saludoH1) {
    const h = new Date().getHours();
    const greet = h < 12 ? "¡Buenos días" : h < 19 ? "¡Buenas tardes" : "¡Buenas noches";
    const emoji = h < 12 ? "🌞" : h < 19 ? "🌥️" : "🌛";
    saludoH1.innerHTML = `${greet}, <span>${perfil.nombre}</span>! ${emoji}`;
  }
}

// ══ ESTADÍSTICAS ══════════════════════════════════════════════════════════════
async function cargarEstadisticas() {
  const { data: perfiles } = await supabaseClient.from("perfiles").select("rol");
  const { data: cursos }   = await supabaseClient.from("cursos").select("id");
  const { data: inscripciones } = await supabaseClient.from("inscripciones").select("id");

  const totalDocentes   = (perfiles || []).filter(p => p.rol === "docente").length;
  const totalEstudiantes = (perfiles || []).filter(p => p.rol === "estudiante").length;
  const totalCursos     = (cursos || []).length;
  const totalInscripciones = (inscripciones || []).length;

  setTexto("statDocentes", totalDocentes);
  setTexto("statEstudiantes", totalEstudiantes);
  setTexto("statCursos", totalCursos);
  setTexto("statInscripciones", totalInscripciones);

  const totalAdmins = (perfiles || []).filter(p => p.rol === "administrador").length;
  await renderGraficosAdmin(perfiles || [], totalDocentes, totalEstudiantes, totalAdmins);
}

let _chartRoles = null, _chartCursosTop = null;
async function renderGraficosAdmin(perfiles, totalDocentes, totalEstudiantes, totalAdmins) {
  const ctxRoles = document.getElementById("graficoRoles");
  if (ctxRoles && window.Chart) {
    if (_chartRoles) _chartRoles.destroy();
    _chartRoles = new Chart(ctxRoles, {
      type: "doughnut",
      data: {
        labels: ["Docentes", "Estudiantes", "Administradores"],
        datasets: [{ data: [totalDocentes, totalEstudiantes, totalAdmins], backgroundColor: ["#0B2F87", "#3B82F6", "#d4af37"] }]
      },
      options: { plugins: { legend: { position: "bottom" } } }
    });
  }

  const { data: cursos } = await supabaseClient.from("cursos").select("id, nombre");
  const cursoIds = (cursos || []).map(c => c.id);
  let conteo = {};
  if (cursoIds.length > 0) {
    const { data: inscripciones } = await supabaseClient
      .from("inscripciones").select("curso_id").in("curso_id", cursoIds);
    (inscripciones || []).forEach(i => conteo[i.curso_id] = (conteo[i.curso_id] || 0) + 1);
  }
  const top5 = (cursos || [])
    .map(c => ({ nombre: c.nombre, total: conteo[c.id] || 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const ctxTop = document.getElementById("graficoCursosTop");
  if (ctxTop && window.Chart) {
    if (_chartCursosTop) _chartCursosTop.destroy();
    _chartCursosTop = new Chart(ctxTop, {
      type: "bar",
      data: {
        labels: top5.map(c => c.nombre),
        datasets: [{ label: "Inscritos", data: top5.map(c => c.total), backgroundColor: "#0B2F87" }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
  }
}

function setTexto(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}

// ══ USUARIOS ══════════════════════════════════════════════════════════════════
async function cargarUsuarios() {
  const { data } = await supabaseClient
    .from("perfiles").select("*").order("nombre", { ascending: true });

  todosUsuarios = data || [];
  renderUsuarios(todosUsuarios);

  document.getElementById("buscarUsuario")?.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    renderUsuarios(todosUsuarios.filter(u =>
      `${u.nombre} ${u.apellido} ${u.correo}`.toLowerCase().includes(q)
    ));
  });

  document.getElementById("filtroRolUsuario")?.addEventListener("change", e => {
    const rol = e.target.value;
    const q = document.getElementById("buscarUsuario")?.value.toLowerCase() || "";
    let filtrados = todosUsuarios.filter(u =>
      `${u.nombre} ${u.apellido} ${u.correo}`.toLowerCase().includes(q)
    );
    if (rol) filtrados = filtrados.filter(u => u.rol === rol);
    renderUsuarios(filtrados);
  });
}

function renderUsuarios(lista) {
  const el = document.getElementById("tablaUsuarios");
  if (!el) return;

  if (lista.length === 0) {
    el.innerHTML = `<p class="sin-datos">No se encontraron usuarios.</p>`;
    return;
  }

  el.innerHTML = lista.map(u => `
    <div class="fila-usuario">
      <div class="avatar-mini avatar-${u.rol}">
        <i class="fas fa-${u.rol === 'docente' ? 'chalkboard-teacher' : u.rol === 'administrador' ? 'user-shield' : 'user-graduate'}"></i>
      </div>
      <div class="usuario-info">
        <strong>${u.nombre} ${u.apellido}</strong>
        <span>${u.correo}</span>
      </div>
      <span class="badge-rol-tabla rol-${u.rol}">${u.rol}</span>
      ${u.rol === 'docente' && u.estado === 'pendiente' ? `<span class="badge-rol-tabla" style="background:#fef3c7;color:#92400e;"><i class="fas fa-clock"></i> Pendiente</span>` : ""}
      ${u.rol !== 'administrador' ? `
        <button class="btn-peligro btn-mini" onclick="eliminarUsuario('${u.user_id}','${u.nombre} ${u.apellido}')">
          <i class="fas fa-trash"></i>
        </button>` : `<span style="width:32px;"></span>`}
    </div>
  `).join("");
}

window.eliminarUsuario = async function(userId, nombre) {
  if (!confirm(`¿Eliminar a "${nombre}"? Esto borrará su perfil y todos sus cursos/inscripciones asociadas.`)) return;

  const { error } = await supabaseClient.from("perfiles").delete().eq("user_id", userId);

  if (error) { alert("Error al eliminar: " + error.message); return; }

  alert("Usuario eliminado del sistema.");
  await cargarUsuarios();
  await cargarEstadisticas();
  await cargarCursosAdmin();
};

// ══ SOLICITUDES DE DOCENTES (APROBACIÓN) ═══════════════════════════════════════
async function cargarSolicitudesPendientes() {
  const { data: solicitudes, error } = await supabaseClient
    .from("perfiles")
    .select("*")
    .eq("rol", "docente")
    .eq("estado", "pendiente")
    .order("nombre", { ascending: true });

  const badge = document.getElementById("badgeSolicitudes");
  const el    = document.getElementById("listaSolicitudes");

  if (error) {
    if (badge) badge.classList.add("oculto");
    if (el) el.innerHTML = `<p class="sin-datos">Aún no has ejecutado el script SQL de aprobación de docentes en Supabase.</p>`;
    return;
  }

  const lista = solicitudes || [];

  if (badge) {
    if (lista.length > 0) {
      badge.textContent = lista.length;
      badge.classList.remove("oculto");
    } else {
      badge.classList.add("oculto");
    }
  }

  if (!el) return;

  if (lista.length === 0) {
    el.innerHTML = `<p class="sin-datos">No hay solicitudes de docentes pendientes por ahora.</p>`;
    return;
  }

  el.innerHTML = lista.map(s => `
    <div class="fila-notif-admin">
      <div>
        <strong>${s.nombre} ${s.apellido}</strong>
        <p style="margin:.2rem 0;font-size:.83rem;color:var(--texto2);">
          <i class="fas fa-envelope"></i> ${s.correo}
          ${s.telefono ? ` · <i class="fas fa-phone"></i> ${s.telefono}` : ""}
        </p>
        <span style="font-size:.72rem;color:#999;">
          <i class="fas fa-chalkboard-teacher"></i> Solicita cuenta de docente
        </span>
      </div>
      <div style="display:flex; gap:.4rem;">
        <button class="btn-primario btn-mini" onclick="aprobarDocente('${s.user_id}','${s.nombre} ${s.apellido}')">
          <i class="fas fa-check"></i> Aceptar
        </button>
        <button class="btn-peligro btn-mini" onclick="rechazarSolicitudDocente('${s.user_id}','${s.nombre} ${s.apellido}')">
          <i class="fas fa-times"></i> Rechazar
        </button>
      </div>
    </div>
  `).join("");
}

window.aprobarDocente = async function(userId, nombre) {
  if (!confirm(`¿Aprobar la cuenta de docente de "${nombre}"? Podrá ingresar a su panel de inmediato.`)) return;

  const { error } = await supabaseClient
    .from("perfiles").update({ estado: "aprobado" }).eq("user_id", userId);

  if (error) { alert("Error al aprobar: " + error.message); return; }

  alert(`Cuenta de "${nombre}" aprobada correctamente.`);
  await cargarSolicitudesPendientes();
  await cargarUsuarios();
  await cargarEstadisticas();
};

window.rechazarSolicitudDocente = async function(userId, nombre) {
  if (!confirm(`¿Rechazar la solicitud de "${nombre}"? Se eliminará su perfil de docente.`)) return;

  const { error } = await supabaseClient
    .from("perfiles").delete().eq("user_id", userId);

  if (error) { alert("Error al rechazar: " + error.message); return; }

  alert(`Solicitud de "${nombre}" rechazada.`);
  await cargarSolicitudesPendientes();
  await cargarUsuarios();
  await cargarEstadisticas();
};

// ══ CURSOS ════════════════════════════════════════════════════════════════════
async function cargarCursosAdmin() {
  const { data: cursos } = await supabaseClient
    .from("cursos").select("*").order("creado_at", { ascending: false });

  todosCursos = cursos || [];

  // Obtener nombres de docentes
  const docenteIds = [...new Set(todosCursos.map(c => c.docente_id))];
  let docentesMap = {};
  if (docenteIds.length > 0) {
    const { data: docentes } = await supabaseClient
      .from("perfiles").select("user_id, nombre, apellido").in("user_id", docenteIds);
    (docentes || []).forEach(d => docentesMap[d.user_id] = d);
  }

  // Obtener conteo de inscritos por curso
  const cursoIds = todosCursos.map(c => c.id);
  let inscritosMap = {};
  if (cursoIds.length > 0) {
    const { data: inscripciones } = await supabaseClient
      .from("inscripciones").select("curso_id").in("curso_id", cursoIds);
    (inscripciones || []).forEach(i => {
      inscritosMap[i.curso_id] = (inscritosMap[i.curso_id] || 0) + 1;
    });
  }

  todosCursos = todosCursos.map(c => ({
    ...c,
    docenteNombre: docentesMap[c.docente_id] ? `${docentesMap[c.docente_id].nombre} ${docentesMap[c.docente_id].apellido}` : "—",
    totalInscritos: inscritosMap[c.id] || 0
  }));

  renderCursosAdmin(todosCursos);

  document.getElementById("buscarCurso")?.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    renderCursosAdmin(todosCursos.filter(c =>
      `${c.nombre} ${c.docenteNombre}`.toLowerCase().includes(q)
    ));
  });
}

function renderCursosAdmin(lista) {
  const el = document.getElementById("gridCursosAdmin");
  if (!el) return;

  if (lista.length === 0) {
    el.innerHTML = `<p class="sin-datos">No hay cursos creados aún.</p>`;
    return;
  }

  el.innerHTML = lista.map(c => `
    <div class="tarjeta-curso-admin">
      <div class="tarjeta-curso-top">
        ${c.nivel ? `<span class="etiqueta-nivel ${c.nivel}">${c.nivel}</span>` : ""}
        <h3>${c.nombre}</h3>
        <p>${c.descripcion || "Sin descripción"}</p>
      </div>
      <div class="tarjeta-curso-admin-footer">
        <span><i class="fas fa-chalkboard-teacher"></i> ${c.docenteNombre}</span>
        <span><i class="fas fa-user-graduate"></i> ${c.totalInscritos} inscritos</span>
        <span><i class="fas fa-key"></i> ${c.codigo}</span>
      </div>
      <button class="btn-peligro btn-mini btn-eliminar-curso" onclick="eliminarCursoAdmin('${c.id}','${c.nombre}')">
        <i class="fas fa-trash"></i> Eliminar curso
      </button>
    </div>
  `).join("");
}

window.eliminarCursoAdmin = async function(cursoId, nombre) {
  if (!confirm(`¿Eliminar el curso "${nombre}"? Se borrarán también sus módulos, anuncios, tareas e inscripciones.`)) return;

  const { error } = await supabaseClient.from("cursos").delete().eq("id", cursoId);

  if (error) { alert("Error al eliminar: " + error.message); return; }

  alert("Curso eliminado correctamente.");
  await cargarCursosAdmin();
  await cargarEstadisticas();
};

// ══ NAV ═══════════════════════════════════════════════════════════════════════
function initNav() {
  document.querySelectorAll(".nav-item[data-vista]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("activo"));
      btn.classList.add("activo");
      mostrarVista(btn.dataset.vista);
      document.getElementById("sidebar")?.classList.remove("abierto");
      document.getElementById("sidebarOverlay")?.classList.remove("activo");
    });
  });
}

window.mostrarVista = function(nombre) {
  document.querySelectorAll(".vista").forEach(v => v.classList.add("oculto"));
  document.getElementById(`vista-${nombre}`)?.classList.remove("oculto");
  document.querySelectorAll(".nav-item[data-vista]").forEach(b => {
    b.classList.toggle("activo", b.dataset.vista === nombre);
      });
      if (nombre === "resumen")  cargarEstadisticas();
  if (nombre === "usuarios") cargarUsuarios();
  if (nombre === "solicitudes") cargarSolicitudesPendientes();
  if (nombre === "cursosadmin") cargarCursosAdmin();
  if (nombre === "labs")     cargarLabs();
  if (nombre === "notificaciones") cargarNotificacionesAdmin();
};

function initSidebar() {
  const btnAbrir = document.getElementById("btnAbrirSidebar");
  const sidebar  = document.getElementById("sidebar");
  const overlay  = document.getElementById("sidebarOverlay");
  btnAbrir?.addEventListener("click", () => {
    sidebar?.classList.toggle("abierto");
    overlay?.classList.toggle("activo");
  });
  overlay?.addEventListener("click", () => {
    sidebar?.classList.remove("abierto");
    overlay?.classList.remove("activo");
  });
}

function initCerrarSesion() {
  document.getElementById("btnCerrarSesion")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "/index.html";
  });
}

// ══ LABORATORIOS ══════════════════════════════════════════════════════════════

async function cargarLabs() {
  const { data: labs, error } = await supabaseClient
    .from("labs").select("*").order("creado_at", { ascending: true });

  const el = document.getElementById("gridLabs");
  if (!el) return;

  if (error || !labs || labs.length === 0) {
    el.innerHTML = `<p class="sin-datos"><i class="fas fa-flask"></i><br>No hay laboratorios registrados.</p>`;
    return;
  }

  el.innerHTML = labs.map(lab => `
    <div class="lab-card" id="lab-card-${lab.id}">
      <div class="lab-card-top">
        <div class="lab-icono">${lab.icono}</div>
        <div class="lab-info">
          <h3>${lab.nombre}</h3>
          <p>${lab.descripcion || ""}</p>
        </div>
      </div>
      <div class="lab-card-footer">
        <div class="lab-estado">
          <span class="lab-badge ${lab.publicado ? 'publicado' : 'oculto'}">
            <i class="fas fa-${lab.publicado ? 'eye' : 'eye-slash'}"></i>
            ${lab.publicado ? 'Visible para estudiantes y docentes' : 'Oculto — solo tú lo ves'}
          </span>
        </div>
        <div class="lab-acciones">
          <a href="${lab.url}" target="_blank" class="btn-primario btn-sm">
            <i class="fas fa-external-link-alt"></i> Abrir lab
          </a>
          <button class="btn-visibilidad-lab ${lab.publicado ? 'publicado' : ''}"
            onclick="toggleLab('${lab.id}', ${lab.publicado})"
            title="${lab.publicado ? 'Ocultar' : 'Publicar'}">
            <i class="fas fa-${lab.publicado ? 'eye-slash' : 'eye'}"></i>
            ${lab.publicado ? 'Ocultar' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

window.toggleLab = async function(labId, publicadoActual) {
  const nuevo = !publicadoActual;
  const { error } = await supabaseClient
    .from("labs").update({ publicado: nuevo }).eq("id", labId);

  if (error) { alert("Error al cambiar visibilidad."); return; }
  await cargarLabs(); // refrescar
};

// ══ EXPORTAR CSV ══════════════════════════════════════════════════════════════
function initExportarCSV() {
  document.getElementById("btnExportarUsuarios")?.addEventListener("click", () => {
    if (!todosUsuarios.length) { alert("No hay usuarios para exportar."); return; }
    let csv = "Nombre,Apellido,Correo,Rol\n";
    todosUsuarios.forEach(u => {
      csv += `"${u.nombre}","${u.apellido}","${u.correo}","${u.rol}"\n`;
    });
    descargarCSV(csv, "Usuarios_RJTechEdu.csv");
  });

  document.getElementById("btnExportarCursos")?.addEventListener("click", () => {
    if (!todosCursos.length) { alert("No hay cursos para exportar."); return; }
    let csv = "Nombre,Docente,Nivel,Codigo,Inscritos\n";
    todosCursos.forEach(c => {
      csv += `"${c.nombre}","${c.docenteNombre}","${c.nivel || ""}","${c.codigo}",${c.totalInscritos}\n`;
    });
    descargarCSV(csv, "Cursos_RJTechEdu.csv");
  });
}

function descargarCSV(csv, nombreArchivo) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nombreArchivo;
  link.click();
}

// ══ NOTIFICACIONES GLOBALES ═══════════════════════════════════════════════════
function initEnviarNotif() {
  document.getElementById("btnEnviarNotif")?.addEventListener("click", async () => {
    const titulo  = document.getElementById("notifTitulo")?.value.trim();
    const mensaje = document.getElementById("notifMensaje")?.value.trim();
    const destino = document.getElementById("notifDestino")?.value || "todos";
    const alerta  = document.getElementById("alertaNotif");

    if (!titulo) { mostrarAlertaAdmin(alerta, "Escribe un título."); return; }

    const { data: { user } } = await supabaseClient.auth.getUser();
    const { error } = await supabaseClient.from("notificaciones").insert({
      titulo, mensaje, rol_destino: destino, creado_por: user.id
    });

    if (error) {
      mostrarAlertaAdmin(alerta, "No se pudo enviar. Verifica que ejecutaste el script SQL de nuevas funciones.");
      return;
    }

    document.getElementById("notifTitulo").value = "";
    document.getElementById("notifMensaje").value = "";
    mostrarAlertaAdmin(alerta, "¡Notificación enviada correctamente!", true);
    await cargarNotificacionesAdmin();
  });
}

function mostrarAlertaAdmin(el, msg, exito) {
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
  el.style.color = exito ? "#1b7a3e" : "#b42318";
  setTimeout(() => { el.style.display = "none"; }, 3500);
}

async function cargarNotificacionesAdmin() {
  const el = document.getElementById("listaNotifAdmin");
  if (!el) return;
  el.innerHTML = `<p class="sin-datos"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>`;

  const { data: notifs, error } = await supabaseClient
    .from("notificaciones").select("*").order("creado_at", { ascending: false });

  if (error) {
    el.innerHTML = `<p class="sin-datos">Aún no has ejecutado el script SQL de nuevas funciones en Supabase.</p>`;
    return;
  }
  if (!notifs || notifs.length === 0) {
    el.innerHTML = `<p class="sin-datos">No has enviado ninguna notificación todavía.</p>`;
    return;
  }

  el.innerHTML = notifs.map(n => `
    <div class="fila-notif-admin">
      <div>
        <strong>${n.titulo}</strong>
        <p style="margin:.2rem 0;font-size:.83rem;color:var(--texto2);">${n.mensaje || ""}</p>
        <span style="font-size:.72rem;color:#999;">
          <i class="fas fa-users"></i> ${n.rol_destino === 'todos' ? 'Todos los usuarios' : n.rol_destino === 'docente' ? 'Solo docentes' : 'Solo estudiantes'}
          · ${new Date(n.creado_at).toLocaleString("es-PE")}
        </span>
      </div>
      <button class="btn-peligro btn-mini" onclick="eliminarNotifAdmin('${n.id}')">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join("");
}

window.eliminarNotifAdmin = async function(id) {
  if (!confirm("¿Eliminar esta notificación?")) return;
  await supabaseClient.from("notificaciones").delete().eq("id", id);
  await cargarNotificacionesAdmin();
};