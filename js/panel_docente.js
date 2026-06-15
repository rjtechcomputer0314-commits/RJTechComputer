/* ════════════════════════════════════════════
   RJTechEdu — panel_docente.js
   ════════════════════════════════════════════ */

let cursosDocente = [];
let cursoActivo   = null;

// ══ INIT ══════════════════════════════════════════════════════════════════════
window.addEventListener("DOMContentLoaded", async () => {
  await verificarSesion();
  await cargarPerfil();
  await cargarCursos();
  initNav();
  initSidebar();
  initCerrarSesion();
  initFormCrearCurso();
  initFormPerfil();
  initTabs();
});

// ══ SESIÓN ════════════════════════════════════════════════════════════════════
async function verificarSesion() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) window.location.href = "/index.html";
}

// ══ PERFIL SIDEBAR ════════════════════════════════════════════════════════════
async function cargarPerfil() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: perfiles } = await supabaseClient
    .from("perfiles")
    .select("*")
    .eq("user_id", user.id);

  if (!perfiles || perfiles.length === 0) return;
  const perfil = perfiles[0];

  const nombreCompleto = `${perfil.nombre} ${perfil.apellido}`;
  const sideNombre = document.getElementById("sideNombre");
  if (sideNombre) sideNombre.textContent = nombreCompleto;

  // Formulario perfil
  const pNombre   = document.getElementById("pNombre");
  const pApellido = document.getElementById("pApellido");
  const pEmail    = document.getElementById("pEmail");
  const pDesde    = document.getElementById("perfilDesde");
  const pNombreDisplay  = document.getElementById("perfilNombreDisplay");
  const pEmailDisplay   = document.getElementById("perfilEmailDisplay");

  if (pNombre)        pNombre.value        = perfil.nombre;
  if (pApellido)      pApellido.value      = perfil.apellido;
  if (pEmail)         pEmail.value         = user.email;
  if (pDesde)         pDesde.textContent   = `Miembro desde ${formatFecha(user.created_at)}`;
  if (pNombreDisplay) pNombreDisplay.textContent = nombreCompleto;
  if (pEmailDisplay)  pEmailDisplay.textContent  = user.email;
}

// ══ CARGAR CURSOS ═════════════════════════════════════════════════════════════
async function cargarCursos() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: cursos } = await supabaseClient
    .from("cursos")
    .select("*")
    .eq("docente_id", user.id)
    .order("creado_at", { ascending: false });

  cursosDocente = cursos || [];
  renderCursos();
  cargarListaEstudiantes();
}

function renderCursos() {
  const contenedor = document.getElementById("gridCursos");
  const msg        = document.getElementById("msgSinCursos");
  if (!contenedor) return;

  if (cursosDocente.length === 0) {
    if (msg) msg.style.display = "";
    contenedor.innerHTML = "";
    return;
  }
  if (msg) msg.style.display = "none";

  contenedor.innerHTML = cursosDocente.map(c => `
    <div class="tarjeta-curso" onclick="abrirDetalle('${c.id}')">
      <div class="tarjeta-curso-top">
        ${c.nivel ? `<span class="etiqueta-nivel ${c.nivel}">${c.nivel}</span>` : ""}
        <h3>${c.nombre}</h3>
        <p>${c.descripcion || ""}</p>
      </div>
      <div class="tarjeta-curso-footer">
        <i class="fas fa-key"></i> ${c.codigo}
      </div>
    </div>
  `).join("");
}

// ══ DETALLE CURSO ═════════════════════════════════════════════════════════════
window.abrirDetalle = async function(cursoId) {
  cursoActivo = cursosDocente.find(c => c.id === cursoId);
  if (!cursoActivo) return;

  document.getElementById("detNombre").textContent = cursoActivo.nombre;
  document.getElementById("detDesc").textContent   = cursoActivo.descripcion || "";
  document.getElementById("detCodigo").textContent = cursoActivo.codigo;
  const nivelEl = document.getElementById("detNivel");
  if (nivelEl) {
    nivelEl.textContent = cursoActivo.nivel || "";
    nivelEl.className   = `etiqueta-nivel ${cursoActivo.nivel || ""}`;
  }

  mostrarVista("detalle");

  // Reset tabs
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("activa"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("oculto"));
  document.querySelector(".tab-btn[data-tab='alumnos']")?.classList.add("activa");
  document.getElementById("tab-alumnos")?.classList.remove("oculto");

  await cargarAlumnosCurso(cursoId);
  await cargarAnunciosCurso(cursoId);
  await cargarArchivosCurso(cursoId);
  await cargarTareasCurso(cursoId);
  initAccionesCurso(cursoId);
};

// Volver y copiar código
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnVolver")?.addEventListener("click", () => mostrarVista("cursos"));

  document.getElementById("btnCopiar")?.addEventListener("click", () => {
    const codigo = document.getElementById("detCodigo")?.textContent;
    if (!codigo) return;
    navigator.clipboard.writeText(codigo).then(() => {
      const btn = document.getElementById("btnCopiar");
      btn.innerHTML = `<i class="fas fa-check"></i>`;
      setTimeout(() => { btn.innerHTML = `<i class="far fa-copy"></i>`; }, 1500);
    });
  });
});

// ══ ALUMNOS DEL CURSO ═════════════════════════════════════════════════════════
async function cargarAlumnosCurso(cursoId) {
  const { data } = await supabaseClient
    .from("inscripciones")
    .select("estudiante_id")
    .eq("curso_id", cursoId);

  const el = document.getElementById("listaAlumnos");
  if (!el) return;

  if (!data || data.length === 0) {
    el.innerHTML = `<p class="sin-datos">Sin estudiantes inscritos.</p>`;
    return;
  }

  const ids = data.map(i => i.estudiante_id);
  const { data: perfiles } = await supabaseClient
    .from("perfiles")
    .select("user_id, nombre, apellido")
    .in("user_id", ids);

  el.innerHTML = `<div class="tabla-alumnos">
    ${(perfiles || []).map(p => `
      <div class="fila-alumno">
        <div class="avatar-mini"><i class="fas fa-user-graduate"></i></div>
        <span>${p.nombre} ${p.apellido}</span>
        <button class="btn-peligro btn-mini" onclick="expulsarEstudiante('${cursoId}','${p.user_id}')">
          <i class="fas fa-user-minus"></i>
        </button>
      </div>
    `).join("")}
  </div>`;
}

window.expulsarEstudiante = async function(cursoId, estudianteId) {
  if (!confirm("¿Retirar a este estudiante del curso?")) return;
  await supabaseClient.from("inscripciones").delete()
    .eq("curso_id", cursoId).eq("estudiante_id", estudianteId);
  await cargarAlumnosCurso(cursoId);
};

// ══ ANUNCIOS ══════════════════════════════════════════════════════════════════
async function cargarAnunciosCurso(cursoId) {
  const { data } = await supabaseClient.from("anuncios").select("*")
    .eq("curso_id", cursoId).order("creado_at", { ascending: false });

  const el = document.getElementById("listaAnuncios");
  if (!el) return;
  el.innerHTML = data?.length
    ? data.map(a => `
      <div class="item-anuncio">
        <div class="meta-fila">
          <span class="meta-fecha">${formatFecha(a.creado_at)}</span>
          <button class="btn-peligro btn-mini" onclick="eliminarAnuncio('${a.id}','${cursoId}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <strong>${a.titulo}</strong>
        <p>${a.contenido}</p>
      </div>`).join("")
    : `<p class="sin-datos">Sin anuncios aún.</p>`;
}

// ══ ARCHIVOS ══════════════════════════════════════════════════════════════════
async function cargarArchivosCurso(cursoId) {
  const { data } = await supabaseClient.from("archivos").select("*")
    .eq("curso_id", cursoId).order("creado_at", { ascending: false });

  const el = document.getElementById("listaArchivos");
  if (!el) return;
  el.innerHTML = data?.length
    ? data.map(a => `
      <div class="item-archivo">
        <a href="${a.url}" target="_blank"><i class="fas fa-file"></i> ${a.nombre_archivo}</a>
        <span class="meta-fecha">${formatFecha(a.creado_at)}</span>
        <button class="btn-peligro btn-mini" onclick="eliminarArchivo('${a.id}','${cursoId}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>`).join("")
    : `<p class="sin-datos">Sin archivos aún.</p>`;
}

// ══ TAREAS ════════════════════════════════════════════════════════════════════
async function cargarTareasCurso(cursoId) {
  const { data } = await supabaseClient.from("tareas").select("*")
    .eq("curso_id", cursoId).order("fecha_entrega", { ascending: true });

  const el = document.getElementById("listaTareas");
  if (!el) return;
  el.innerHTML = data?.length
    ? data.map(t => `
      <div class="item-tarea">
        <div class="meta-fila">
          ${t.fecha_entrega ? `<span class="vence-tag ${urgencia(t.fecha_entrega)}">Vence: ${formatFecha(t.fecha_entrega)}</span>` : ""}
          <button class="btn-peligro btn-mini" onclick="eliminarTarea('${t.id}','${cursoId}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <strong>${t.titulo}</strong>
        <p>${t.descripcion || ""}</p>
        ${t.puntos ? `<span style="font-size:.8rem;color:var(--azul2);font-weight:700;">${t.puntos} pts</span>` : ""}
      </div>`).join("")
    : `<p class="sin-datos">Sin tareas aún.</p>`;
}

// ══ ACCIONES DETALLE ══════════════════════════════════════════════════════════
function initAccionesCurso(cursoId) {
  // Publicar anuncio
  clonar("btnPublicarAnuncio");
  document.getElementById("btnPublicarAnuncio")?.addEventListener("click", async () => {
    const titulo    = document.getElementById("anuncioTitulo")?.value.trim();
    const contenido = document.getElementById("anuncioContenido")?.value.trim();
    const alerta    = document.getElementById("alertaAnuncio");
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!titulo || !contenido) { mostrarAlerta(alerta, "error", "Completa título y contenido."); return; }
    const { error } = await supabaseClient.from("anuncios")
      .insert({ curso_id: cursoId, docente_id: user.id, titulo, contenido });
    if (error) { mostrarAlerta(alerta, "error", "Error al publicar."); return; }
    mostrarAlerta(alerta, "ok", "Anuncio publicado.");
    document.getElementById("anuncioTitulo").value    = "";
    document.getElementById("anuncioContenido").value = "";
    await cargarAnunciosCurso(cursoId);
  });

  // Subir archivo
  clonar("btnSubirArchivo");
  document.getElementById("btnSubirArchivo")?.addEventListener("click", async () => {
    const nombre = document.getElementById("archivoNombre")?.value.trim();
    const url    = document.getElementById("archivoUrl")?.value.trim();
    const alerta = document.getElementById("alertaArchivo");
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!nombre || !url) { mostrarAlerta(alerta, "error", "Completa nombre y URL."); return; }
    const { error } = await supabaseClient.from("archivos")
      .insert({ curso_id: cursoId, docente_id: user.id, nombre_archivo: nombre, url });
    if (error) { mostrarAlerta(alerta, "error", "Error al agregar archivo."); return; }
    mostrarAlerta(alerta, "ok", "Archivo agregado.");
    document.getElementById("archivoNombre").value = "";
    document.getElementById("archivoUrl").value    = "";
    await cargarArchivosCurso(cursoId);
  });

  // Crear tarea
  clonar("btnCrearTarea");
  document.getElementById("btnCrearTarea")?.addEventListener("click", async () => {
    const titulo = document.getElementById("tareaTitulo")?.value.trim();
    const desc   = document.getElementById("tareaDesc")?.value.trim();
    const fecha  = document.getElementById("tareaFecha")?.value;
    const puntos = document.getElementById("tareaPuntos")?.value;
    const alerta = document.getElementById("alertaTarea");
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!titulo) { mostrarAlerta(alerta, "error", "El título es obligatorio."); return; }
    const { error } = await supabaseClient.from("tareas").insert({
      curso_id: cursoId, docente_id: user.id, titulo,
      descripcion: desc || null,
      fecha_entrega: fecha || null,
      puntos: puntos ? parseInt(puntos) : null,
    });
    if (error) { mostrarAlerta(alerta, "error", "Error al crear tarea."); return; }
    mostrarAlerta(alerta, "ok", "Tarea creada.");
    document.getElementById("tareaTitulo").value = "";
    document.getElementById("tareaDesc").value   = "";
    document.getElementById("tareaFecha").value  = "";
    document.getElementById("tareaPuntos").value = "";
    await cargarTareasCurso(cursoId);
  });

  // Eliminar curso
  clonar("btnEliminarCurso");
  document.getElementById("btnEliminarCurso")?.addEventListener("click", async () => {
    if (!confirm(`¿Eliminar "${cursoActivo.nombre}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabaseClient.from("cursos").delete().eq("id", cursoId);
    if (error) { alert("Error al eliminar."); return; }
    cursosDocente = cursosDocente.filter(c => c.id !== cursoId);
    renderCursos();
    mostrarVista("cursos");
  });
}

// Eliminar elementos
window.eliminarAnuncio = async function(id, cursoId) {
  if (!confirm("¿Eliminar este anuncio?")) return;
  await supabaseClient.from("anuncios").delete().eq("id", id);
  await cargarAnunciosCurso(cursoId);
};
window.eliminarArchivo = async function(id, cursoId) {
  if (!confirm("¿Eliminar este archivo?")) return;
  await supabaseClient.from("archivos").delete().eq("id", id);
  await cargarArchivosCurso(cursoId);
};
window.eliminarTarea = async function(id, cursoId) {
  if (!confirm("¿Eliminar esta tarea?")) return;
  await supabaseClient.from("tareas").delete().eq("id", id);
  await cargarTareasCurso(cursoId);
};

// ══ PESTAÑAS DETALLE ══════════════════════════════════════════════════════════
function initTabs() {
  document.addEventListener("click", e => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("activa"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("oculto"));
    btn.classList.add("activa");
    document.getElementById(`tab-${btn.dataset.tab}`)?.classList.remove("oculto");
  });
}

// ══ CREAR CURSO ═══════════════════════════════════════════════════════════════
function initFormCrearCurso() {
  const form = document.getElementById("formCrearCurso");
  if (!form) return;

  cargarCheckEstudiantes();

  document.getElementById("buscarEstudiante")?.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll(".check-item").forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const nombre = document.getElementById("cNombre")?.value.trim();
    const nivel  = document.getElementById("cNivel")?.value;
    const desc   = document.getElementById("cDesc")?.value.trim();
    const alerta = document.getElementById("alertaCrearCurso");

    let valido = true;
    if (!nombre) { setErr("errCNombre", "Campo obligatorio."); valido = false; } else setErr("errCNombre", "");
    if (!nivel)  { setErr("errCNivel",  "Elige un nivel.");    valido = false; } else setErr("errCNivel", "");
    if (!valido) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    const codigo = generarCodigo();

    const { data: cursoDB, error } = await supabaseClient.from("cursos").insert({
      docente_id: user.id, nombre, descripcion: desc || null, nivel, codigo,
    }).select().single();

    if (error) { mostrarAlerta(alerta, "error", "Error al crear el curso."); return; }

    const checks = document.querySelectorAll(".check-estudiante:checked");
    if (checks.length > 0) {
      const inscripciones = Array.from(checks).map(c => ({
        curso_id: cursoDB.id, estudiante_id: c.value,
      }));
      await supabaseClient.from("inscripciones").insert(inscripciones);
    }

    mostrarAlerta(alerta, "ok", `¡Curso creado! Código: ${codigo}`);
    form.reset();
    await cargarCursos();
    setTimeout(() => mostrarVista("cursos"), 1500);
  });
}

async function cargarCheckEstudiantes() {
  const { data } = await supabaseClient.from("perfiles")
    .select("user_id, nombre, apellido").eq("rol", "estudiante");
  const lista = document.getElementById("listaCheckEstudiantes");
  if (!lista || !data) return;
  lista.innerHTML = data.length
    ? data.map(e => `
      <label class="check-item">
        <input type="checkbox" class="check-estudiante" value="${e.user_id}">
        ${e.nombre} ${e.apellido}
      </label>`).join("")
    : `<p class="sin-datos" style="font-size:.82rem;">No hay estudiantes registrados aún.</p>`;
}

// ══ LISTA ESTUDIANTES ═════════════════════════════════════════════════════════
async function cargarListaEstudiantes() {
  const cursoIds = cursosDocente.map(c => c.id);
  const tabla    = document.getElementById("tablaEstudiantes");
  if (!tabla) return;

  if (cursoIds.length === 0) {
    tabla.innerHTML = `<p class="sin-datos">Aún no tienes cursos con estudiantes.</p>`;
    return;
  }

  const { data } = await supabaseClient
    .from("inscripciones")
    .select("estudiante_id, curso_id")
    .in("curso_id", cursoIds);

  if (!data || data.length === 0) {
    tabla.innerHTML = `<p class="sin-datos">Sin estudiantes inscritos.</p>`;
    return;
  }

  const ids = [...new Set(data.map(i => i.estudiante_id))];

  const { data: perfiles } = await supabaseClient
    .from("perfiles")
    .select("user_id, nombre, apellido")
    .in("user_id", ids);

  const perfilesMap = {};
  (perfiles || []).forEach(p => perfilesMap[p.user_id] = p);

  const cursosMap = {};
  cursosDocente.forEach(c => cursosMap[c.id] = c);

  let items = data.map(i => ({
    nombre:   perfilesMap[i.estudiante_id]?.nombre   || "",
    apellido: perfilesMap[i.estudiante_id]?.apellido || "",
    curso:    cursosMap[i.curso_id]?.nombre          || ""
  }));

  const renderTabla = (lista) => {
    tabla.innerHTML = lista.length
      ? `<div class="tabla-estudiantes">
          ${lista.map(i => `
            <div class="fila-estudiante">
              <div class="avatar-mini"><i class="fas fa-user-graduate"></i></div>
              <span>${i.nombre} ${i.apellido}</span>
              <span class="curso-tag">${i.curso}</span>
            </div>`).join("")}
        </div>`
      : `<p class="sin-datos">Sin estudiantes inscritos.</p>`;
  };

  renderTabla(items);

  document.getElementById("buscarEstudianteTabla")?.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    renderTabla(items.filter(i =>
      `${i.nombre} ${i.apellido}`.toLowerCase().includes(q)
    ));
  });
}

// ══ PERFIL FORM ═══════════════════════════════════════════════════════════════
function initFormPerfil() {
  const form = document.getElementById("formPerfil");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const nombre   = document.getElementById("pNombre")?.value.trim();
    const apellido = document.getElementById("pApellido")?.value.trim();
    const clave    = document.getElementById("pClave")?.value;
    const alerta   = document.getElementById("alertaPerfil");

    let valido = true;
    if (!nombre)   { setErr("errPNombre",   "Campo obligatorio."); valido = false; } else setErr("errPNombre", "");
    if (!apellido) { setErr("errPApellido", "Campo obligatorio."); valido = false; } else setErr("errPApellido", "");
    if (clave && clave.length < 6) { setErr("errPClave", "Mínimo 6 caracteres."); valido = false; } else setErr("errPClave", "");
    if (!valido) return;

    const { data: { user } } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient.from("perfiles")
      .update({ nombre, apellido }).eq("user_id", user.id);
    if (error) { mostrarAlerta(alerta, "error", "Error al guardar."); return; }

    if (clave) {
      const { error: errClave } = await supabaseClient.auth.updateUser({ password: clave });
      if (errClave) { mostrarAlerta(alerta, "error", "Perfil guardado pero error al cambiar contraseña."); return; }
    }

    mostrarAlerta(alerta, "ok", "¡Cambios guardados!");
    const nombreCompleto = `${nombre} ${apellido}`;
    const sideNombre = document.getElementById("sideNombre");
    if (sideNombre) sideNombre.textContent = nombreCompleto;
    const pNombreDisplay = document.getElementById("perfilNombreDisplay");
    if (pNombreDisplay) pNombreDisplay.textContent = nombreCompleto;
  });

  document.querySelectorAll(".btn-ojo").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.objetivo);
      const icon  = btn.querySelector("i");
      if (!input) return;
      const show = input.type === "password";
      input.type     = show ? "text" : "password";
      icon.className = show ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
    });
  });
}

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
  // Sincronizar nav activo
  document.querySelectorAll(".nav-item[data-vista]").forEach(b => {
    b.classList.toggle("activo", b.dataset.vista === nombre);
  });
};

function initSidebar() {
  const btnAbrir  = document.getElementById("btnAbrirSidebar");
  const sidebar   = document.getElementById("sidebar");
  const overlay   = document.getElementById("sidebarOverlay");

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

// ══ UTILS ═════════════════════════════════════════════════════════════════════
function generarCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function formatFecha(str) {
  if (!str) return "";
  return new Date(str).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function urgencia(fecha) {
  if (!fecha) return "";
  const diff = (new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24);
  if (diff < 0)  return "vencida";
  if (diff < 2)  return "urgente";
  return "";
}

function mostrarAlerta(el, tipo, msg) {
  if (!el) return;
  el.className = `alerta alerta-${tipo} visible`;
  el.innerHTML = `<i class="fas fa-${tipo === "ok" ? "circle-check" : "circle-exclamation"}"></i> ${msg}`;
  setTimeout(() => el.classList.remove("visible"), 4000);
}

function setErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clonar(id) {
  const el = document.getElementById(id);
  if (el) el.replaceWith(el.cloneNode(true));
}
