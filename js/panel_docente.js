/* ════════════════════════════════════════════
   RJTechEdu — panel_estudiante.js
   ════════════════════════════════════════════ */

let perfilActual   = null;
let cursosInscritos = [];

// ══ INIT ══════════════════════════════════════════════════════════════════════
window.addEventListener("DOMContentLoaded", async () => {
  await verificarSesion();
  await cargarPerfil();
  await cargarDatos();
  initNav();
  initSidebar();
  initCerrarSesion();
  initFormCodigo();
  initFormPerfil();
});

// ══ SESIÓN ════════════════════════════════════════════════════════════════════
async function verificarSesion() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) window.location.href = "/index.html";
}

// ══ PERFIL ════════════════════════════════════════════════════════════════════
async function cargarPerfil() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: perfil } = await supabaseClient
    .from("perfiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!perfil) return;
  perfilActual = { ...perfil, email: user.email, created_at: user.created_at };

  const nombreCompleto = `${perfil.nombre} ${perfil.apellido}`;

  // Sidebar
  const sideNombre = document.getElementById("sideNombre");
  if (sideNombre) sideNombre.textContent = nombreCompleto;

  // Saludo
  const saludoH1 = document.getElementById("saludoH1");
  if (saludoH1) {
    const h = new Date().getHours();
    const greet = h < 12 ? "¡Buenos días" : h < 19 ? "¡Buenas tardes" : "¡Buenas noches";
    const emoji = h < 12 ? "☀️" : h < 19 ? "🌤️" : "🌙";
    saludoH1.innerHTML = `${greet}, <span>${perfil.nombre}</span>! ${emoji}`;
  }

  // Vista perfil
  const pNombreDisplay  = document.getElementById("perfilNombreDisplay");
  const pEmailDisplay   = document.getElementById("perfilEmailDisplay");
  const pDesde          = document.getElementById("perfilDesde");
  const pNombre         = document.getElementById("pNombre");
  const pApellido       = document.getElementById("pApellido");
  const pEmail          = document.getElementById("pEmail");

  if (pNombreDisplay) pNombreDisplay.textContent = nombreCompleto;
  if (pEmailDisplay)  pEmailDisplay.textContent  = user.email;
  if (pDesde)         pDesde.textContent = `Miembro desde ${formatFecha(user.created_at)}`;
  if (pNombre)        pNombre.value   = perfil.nombre;
  if (pApellido)      pApellido.value = perfil.apellido;
  if (pEmail)         pEmail.value    = user.email;
}

// ══ CARGAR DATOS ══════════════════════════════════════════════════════════════
async function cargarDatos() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: inscripciones } = await supabaseClient
    .from("inscripciones")
    .select(`
        curso_id,
        cursos (
            id, nombre, descripcion, nivel, codigo, docente_id
        )
    `)
    .eq("estudiante_id", user.id);

  cursosInscritos = (inscripciones || []).map(i => i.cursos).filter(Boolean);

  renderGridCursos();

  const cursoIds = cursosInscritos.map(c => c.id);

  if (cursoIds.length === 0) {
    renderVacioAside();
    return;
  }

  const [{ data: anuncios }, { data: tareas }, { data: archivos }] = await Promise.all([
    supabaseClient.from("anuncios").select("*, cursos(nombre)").in("curso_id", cursoIds).order("creado_at", { ascending: false }),
    supabaseClient.from("tareas").select("*, cursos(nombre)").in("curso_id", cursoIds).order("fecha_entrega", { ascending: true }),
    supabaseClient.from("archivos").select("*, cursos(nombre)").in("curso_id", cursoIds).order("creado_at", { ascending: false }),
  ]);

  renderAsideAnuncios(anuncios || []);
  renderAsideTareas(tareas || []);
  renderAsideArchivos(archivos || []);
  renderAnuncios(anuncios || []);
  renderTareas(tareas || []);
  renderArchivos(archivos || []);
  llenarFiltros(cursosInscritos);
}

// ══ GRID CURSOS ═══════════════════════════════════════════════════════════════
function renderGridCursos() {
  const contenedor = document.getElementById("gridCursos");
  const msg        = document.getElementById("msgSinCursos");
  if (!contenedor) return;

  if (cursosInscritos.length === 0) {
    if (msg) msg.style.display = "";
    contenedor.innerHTML = "";
    return;
  }
  if (msg) msg.style.display = "none";

  contenedor.innerHTML = cursosInscritos.map(c => `
    <div class="tarjeta-curso" onclick="abrirDetalleCurso('${c.id}')">
      <div class="tarjeta-curso-top">
        ${c.nivel ? `<span class="etiqueta-nivel ${c.nivel}">${c.nivel}</span>` : ""}
        <h3>${c.nombre}</h3>
        <p>${c.descripcion || ""}</p>
      </div>
      <div class="tarjeta-curso-footer">
        <i class="fas fa-chalkboard-teacher"></i>
        ${c.perfiles?.nombre || ""} ${c.perfiles?.apellido || ""}
      </div>
    </div>
  `).join("");
}

// ══ DETALLE CURSO ═════════════════════════════════════════════════════════════
window.abrirDetalleCurso = async function(cursoId) {
  const curso = cursosInscritos.find(c => c.id === cursoId);
  if (!curso) return;

  document.getElementById("detNombre").textContent = curso.nombre;
  document.getElementById("detDesc").textContent   = curso.descripcion || "";
  document.getElementById("detCodigo").textContent = curso.codigo;
  const nivelEl = document.getElementById("detNivel");
  if (nivelEl) {
    nivelEl.textContent = curso.nivel || "";
    nivelEl.className   = `etiqueta-nivel ${curso.nivel || ""}`;
  }

  mostrarVista("detalle");

  // Reset tabs
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("activa"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("oculto"));
  document.querySelector(".tab-btn[data-tab='anuncios-det']")?.classList.add("activa");
  document.getElementById("tab-anuncios-det")?.classList.remove("oculto");

  await cargarDetalleCurso(cursoId);
};

async function cargarDetalleCurso(cursoId) {
  const [{ data: anuncios }, { data: archivos }, { data: tareas }] = await Promise.all([
    supabaseClient.from("anuncios").select("*").eq("curso_id", cursoId).order("creado_at", { ascending: false }),
    supabaseClient.from("archivos").select("*").eq("curso_id", cursoId).order("creado_at", { ascending: false }),
    supabaseClient.from("tareas").select("*").eq("curso_id", cursoId).order("fecha_entrega", { ascending: true }),
  ]);

  const elA  = document.getElementById("tab-anuncios-det");
  const elAr = document.getElementById("tab-archivos-det");
  const elT  = document.getElementById("tab-tareas-det");

  if (elA) elA.innerHTML = anuncios?.length
    ? anuncios.map(a => `
        <div class="item-anuncio">
          <div class="meta-fila">
            <span class="meta-fecha">${formatFecha(a.creado_at)}</span>
          </div>
          <strong>${a.titulo}</strong>
          <p>${a.contenido}</p>
        </div>`).join("")
    : `<p class="sin-datos">Sin anuncios.</p>`;

  if (elAr) elAr.innerHTML = archivos?.length
    ? archivos.map(a => `
        <div class="item-archivo">
          <a href="${a.url}" target="_blank"><i class="fas fa-file"></i> ${a.nombre_archivo}</a>
          <span class="meta-fecha">${formatFecha(a.creado_at)}</span>
        </div>`).join("")
    : `<p class="sin-datos">Sin archivos.</p>`;

  if (elT) elT.innerHTML = tareas?.length
    ? tareas.map(t => `
        <div class="item-tarea">
          <div class="meta-fila">
            ${t.fecha_entrega ? `<span class="vence-tag ${urgencia(t.fecha_entrega)}">Vence: ${formatFecha(t.fecha_entrega)}</span>` : ""}
          </div>
          <strong>${t.titulo}</strong>
          <p>${t.descripcion || ""}</p>
          ${t.puntos ? `<span style="font-size:.8rem;color:var(--azul2);font-weight:700;">${t.puntos} pts</span>` : ""}
        </div>`).join("")
    : `<p class="sin-datos">Sin tareas.</p>`;
}

// ══ ASIDE ═════════════════════════════════════════════════════════════════════
function renderVacioAside() {
  ["asideAnuncios","asideTareas","asideArchivos"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<p class="aside-vacio">Sin datos</p>`;
  });
}

function renderAsideAnuncios(anuncios) {
  const el = document.getElementById("asideAnuncios");
  if (!el) return;
  el.innerHTML = anuncios.length
    ? anuncios.slice(0,3).map(a => `
        <div class="aside-item">
          <strong>${a.titulo}</strong>
          <span class="curso-tag">${a.cursos?.nombre || ""}</span>
        </div>`).join("")
    : `<p class="aside-vacio">Sin anuncios</p>`;
}

function renderAsideTareas(tareas) {
  const el = document.getElementById("asideTareas");
  if (!el) return;
  const pendientes = tareas.filter(t => t.fecha_entrega && new Date(t.fecha_entrega) >= new Date());
  el.innerHTML = pendientes.length
    ? pendientes.slice(0,3).map(t => `
        <div class="aside-item">
          <strong>${t.titulo}</strong>
          <span class="vence-tag ${urgencia(t.fecha_entrega)}">Vence: ${formatFecha(t.fecha_entrega)}</span>
        </div>`).join("")
    : `<p class="aside-vacio">Sin tareas pendientes</p>`;
}

function renderAsideArchivos(archivos) {
  const el = document.getElementById("asideArchivos");
  if (!el) return;
  el.innerHTML = archivos.length
    ? archivos.slice(0,3).map(a => `
        <div class="aside-item">
          <a href="${a.url}" target="_blank" style="color:var(--azul2);font-size:.82rem;">
            <i class="fas fa-file"></i> ${a.nombre_archivo}
          </a>
          <span class="curso-tag">${a.cursos?.nombre || ""}</span>
        </div>`).join("")
    : `<p class="aside-vacio">Sin archivos</p>`;
}

// ══ VISTAS GENERALES ══════════════════════════════════════════════════════════
function renderAnuncios(anuncios) {
  const el = document.getElementById("listaAnuncios");
  if (!el) return;
  el.innerHTML = anuncios.length
    ? anuncios.map(a => `
        <div class="item-anuncio">
          <div class="meta-fila">
            <span class="curso-tag">${a.cursos?.nombre || ""}</span>
            <span class="meta-fecha">${formatFecha(a.creado_at)}</span>
          </div>
          <strong>${a.titulo}</strong>
          <p>${a.contenido}</p>
        </div>`).join("")
    : `<p class="sin-datos">Sin anuncios en tus cursos.</p>`;
}

function renderTareas(tareas) {
  const el = document.getElementById("listaTareas");
  if (!el) return;
  el.innerHTML = tareas.length
    ? tareas.map(t => `
        <div class="item-tarea">
          <div class="meta-fila">
            <span class="curso-tag">${t.cursos?.nombre || ""}</span>
            ${t.fecha_entrega ? `<span class="vence-tag ${urgencia(t.fecha_entrega)}">Vence: ${formatFecha(t.fecha_entrega)}</span>` : ""}
          </div>
          <strong>${t.titulo}</strong>
          <p>${t.descripcion || ""}</p>
          ${t.puntos ? `<span style="font-size:.8rem;color:var(--azul2);font-weight:700;">${t.puntos} pts</span>` : ""}
        </div>`).join("")
    : `<p class="sin-datos">Sin tareas.</p>`;
}

function renderArchivos(archivos) {
  const el = document.getElementById("listaArchivos");
  if (!el) return;
  el.innerHTML = archivos.length
    ? archivos.map(a => `
        <div class="item-archivo">
          <span class="curso-tag">${a.cursos?.nombre || ""}</span>
          <a href="${a.url}" target="_blank"><i class="fas fa-file"></i> ${a.nombre_archivo}</a>
          <span class="meta-fecha">${formatFecha(a.creado_at)}</span>
        </div>`).join("")
    : `<p class="sin-datos">Sin archivos.</p>`;
}

function llenarFiltros(cursos) {
  ["filtroAnuncios","filtroArchivos","filtroTareas"].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    // limpiar opciones previas excepto la primera
    while (sel.options.length > 1) sel.remove(1);
    cursos.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nombre;
      sel.appendChild(opt);
    });
  });
}

// ══ UNIRSE A CURSO ════════════════════════════════════════════════════════════
function initFormCodigo() {
  const form = document.getElementById("formCodigo");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const codigo  = document.getElementById("inputCodigo")?.value.trim().toUpperCase();
    const alerta  = document.getElementById("alertaCodigo");
    const errEl   = document.getElementById("errCodigo");

    if (!codigo) { if (errEl) errEl.textContent = "Ingresa un código."; return; }
    if (errEl) errEl.textContent = "";

    const { data: { user } } = await supabaseClient.auth.getUser();

    const { data: curso, error: errBuscar } = await supabaseClient
      .from("cursos")
      .select("id, nombre")
      .eq("codigo", codigo)
      .single();

    if (errBuscar || !curso) {
      mostrarAlerta(alerta, "error", "Código incorrecto. Verifica con tu docente.");
      return;
    }

    const { data: yaInscrito } = await supabaseClient
      .from("inscripciones")
      .select("id")
      .eq("curso_id", curso.id)
      .eq("estudiante_id", user.id)
      .single();

    if (yaInscrito) {
      mostrarAlerta(alerta, "info", "Ya estás inscrito en este curso.");
      return;
    }

    const { error: errInscribir } = await supabaseClient
      .from("inscripciones")
      .insert({ curso_id: curso.id, estudiante_id: user.id });

    if (errInscribir) {
      mostrarAlerta(alerta, "error", "No se pudo inscribir. Intenta de nuevo.");
      return;
    }

    mostrarAlerta(alerta, "ok", `¡Te uniste a "${curso.nombre}" exitosamente!`);
    document.getElementById("inputCodigo").value = "";
    await cargarDatos();
    setTimeout(() => mostrarVista("cursos"), 1500);
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

    const { error } = await supabaseClient
      .from("perfiles")
      .update({ nombre, apellido })
      .eq("user_id", user.id);

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

  // tabs detalle
  document.addEventListener("click", e => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("activa"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("oculto"));
    btn.classList.add("activa");
    document.getElementById(`tab-${btn.dataset.tab}`)?.classList.remove("oculto");
  });

  document.getElementById("btnVolverCursos")?.addEventListener("click", () => mostrarVista("cursos"));
}

window.mostrarVista = function(nombre) {
  document.querySelectorAll(".vista").forEach(v => v.classList.add("oculto"));
  document.getElementById(`vista-${nombre}`)?.classList.remove("oculto");
  document.querySelectorAll(".nav-item[data-vista]").forEach(b => {
    b.classList.toggle("activo", b.dataset.vista === nombre);
  });
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

// ══ UTILS ═════════════════════════════════════════════════════════════════════
function formatFecha(str) {
  if (!str) return "";
  return new Date(str).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function urgencia(fecha) {
  if (!fecha) return "";
  const diff = (new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "vencida";
  if (diff < 2) return "urgente";
  return "";
}

function mostrarAlerta(el, tipo, msg) {
  if (!el) return;
  el.className = `alerta alerta-${tipo} visible`;
  el.innerHTML = `<i class="fas fa-${tipo === "ok" ? "circle-check" : tipo === "info" ? "circle-info" : "circle-exclamation"}"></i> ${msg}`;
  setTimeout(() => el.classList.remove("visible"), 4000);
}

function setErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
