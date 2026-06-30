let perfilActual    = null;
let cursosInscritos = [];
let cursoVistaActivo = null;

// ══ INIT 
window.addEventListener("DOMContentLoaded", async () => {
  await verificarSesion();
  await cargarPerfil();
  await cargarDatos();
  initNav();
  initSidebar();
  initCerrarSesion();
  initFormCodigo();
  initFormPerfil();
  initTabs();
});

// ══ SESIÓN
async function verificarSesion() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) window.location.href = "/index.html";
}

// ══ PERFIL 
async function cargarPerfil() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: perfil } = await supabaseClient
    .from("perfiles").select("*").eq("user_id", user.id).single();

  if (!perfil) return;
  perfilActual = { ...perfil, email: user.email, created_at: user.created_at };

  const nombreCompleto = `${perfil.nombre} ${perfil.apellido}`;

  const sideNombre = document.getElementById("sideNombre");
  if (sideNombre) sideNombre.textContent = nombreCompleto;

  const saludoH1 = document.getElementById("saludoH1");
  if (saludoH1) {
    const h = new Date().getHours();
    const greet = h < 12 ? "¡Buenos días" : h < 19 ? "¡Buenas tardes" : "¡Buenas noches";
    const emoji = h < 12 ? "☀️" : h < 19 ? "🌤️" : "🌙";
    saludoH1.innerHTML = `${greet}, <span>${perfil.nombre}</span>! ${emoji}`;
  }

  const pNombreDisplay = document.getElementById("perfilNombreDisplay");
  const pEmailDisplay  = document.getElementById("perfilEmailDisplay");
  const pDesde         = document.getElementById("perfilDesde");
  const pNombre        = document.getElementById("pNombre");
  const pApellido      = document.getElementById("pApellido");
  const pEmail         = document.getElementById("pEmail");

  if (pNombreDisplay) pNombreDisplay.textContent = nombreCompleto;
  if (pEmailDisplay)  pEmailDisplay.textContent  = user.email;
  if (pDesde)         pDesde.textContent = `Miembro desde ${formatFecha(user.created_at)}`;
  if (pNombre)        pNombre.value   = perfil.nombre;
  if (pApellido)      pApellido.value = perfil.apellido;
  if (pEmail)         pEmail.value    = user.email;
}

// ══ CARGAR DATOS
async function cargarDatos() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: inscripciones } = await supabaseClient
    .from("inscripciones")
    .select("curso_id, cursos (id, nombre, descripcion, nivel, codigo, docente_id, publicado)")
    .eq("estudiante_id", user.id);

  cursosInscritos = (inscripciones || []).map(i => i.cursos).filter(c => c && c.publicado === true);

  // Obtener nombre del docente para cada curso
  const docenteIds = [...new Set(cursosInscritos.map(c => c.docente_id))];
  if (docenteIds.length > 0) {
    const { data: docentes } = await supabaseClient
      .from("perfiles").select("user_id, nombre, apellido").in("user_id", docenteIds);
    const docentesMap = {};
    (docentes || []).forEach(d => docentesMap[d.user_id] = d);
    cursosInscritos = cursosInscritos.map(c => ({
      ...c,
      docenteNombre: docentesMap[c.docente_id]
        ? `${docentesMap[c.docente_id].nombre} ${docentesMap[c.docente_id].apellido}`
        : ""
    }));
  }

  renderGridCursos();

  const cursoIds = cursosInscritos.map(c => c.id);
  if (cursoIds.length === 0) {
    renderVacioAside();
    return;
  }

  const [{ data: anuncios }, { data: tareas }, { data: archivos }] = await Promise.all([
    supabaseClient.from("anuncios").select("*").in("curso_id", cursoIds).order("creado_at", { ascending: false }),
    supabaseClient.from("tareas").select("*").in("curso_id", cursoIds).order("fecha_entrega", { ascending: true }),
    supabaseClient.from("archivos").select("*").in("curso_id", cursoIds).order("creado_at", { ascending: false }),
  ]);

  const cursosMap = {};
  cursosInscritos.forEach(c => cursosMap[c.id] = c);

  const anunciosConCurso = (anuncios || []).map(a => ({ ...a, cursoNombre: cursosMap[a.curso_id]?.nombre || "" }));
  const tareasConCurso   = (tareas   || []).map(t => ({ ...t, cursoNombre: cursosMap[t.curso_id]?.nombre || "" }));
  const archivosConCurso = (archivos || []).map(a => ({ ...a, cursoNombre: cursosMap[a.curso_id]?.nombre || "" }));

 // guardar caché para los filtros
  window._anunciosCache = anunciosConCurso;
  window._tareasCache   = tareasConCurso;
  window._archivosCache = archivosConCurso;

  renderAsideAnuncios(anunciosConCurso);
  renderAsideTareas(tareasConCurso);
  renderAsideArchivos(archivosConCurso);
  renderAnuncios(anunciosConCurso);
  renderTareas(tareasConCurso);
  renderArchivos(archivosConCurso);
  llenarFiltros(cursosInscritos);
}

// ══ GRID CURSOS 
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
        <i class="fas fa-chalkboard-teacher"></i> ${c.docenteNombre || ""}
      </div>
    </div>
  `).join("");
}

// ══ DETALLE CURSO (módulos) 
window.abrirDetalleCurso = async function(cursoId) {
  const curso = cursosInscritos.find(c => c.id === cursoId);
  if (!curso) return;
  cursoVistaActivo = curso;

  document.getElementById("detNombre").textContent = curso.nombre;
  document.getElementById("detDesc").textContent   = curso.descripcion || "";
  document.getElementById("detCodigo").textContent = curso.codigo;
  const nivelEl = document.getElementById("detNivel");
  if (nivelEl) {
    nivelEl.textContent = curso.nivel || "";
    nivelEl.className   = `etiqueta-nivel ${curso.nivel || ""}`;
  }

  mostrarVista("detalle");
  await cargarModulosEstudiante(cursoId);
};

async function cargarModulosEstudiante(cursoId) {
  const { data: modulos } = await supabaseClient
    .from("modulos").select("*").eq("curso_id", cursoId)
    .order("orden", { ascending: true });

  const el = document.getElementById("listaModulosEstudiante");
  if (!el) return;

  if (!modulos || modulos.length === 0) {
    el.innerHTML = `<p class="sin-datos">El docente aún no ha publicado módulos.</p>`;
    return;
  }

  el.innerHTML = modulos.map(m => `
    <div class="modulo-card" onclick="abrirModuloEstudiante('${m.id}','${cursoId}')" style="cursor:pointer;">
      <div class="modulo-header">
        <div class="modulo-info">
          <i class="fas fa-book-open" style="color:var(--rosa2)"></i>
          <strong>${m.titulo}</strong>
        </div>
        <i class="fas fa-chevron-right" style="color:var(--texto2)"></i>
      </div>
    </div>
  `).join("");
}

window.abrirModuloEstudiante = async function(moduloId, cursoId) {
  const { data: modulo } = await supabaseClient
    .from("modulos").select("*").eq("id", moduloId).single();

  document.getElementById("moduloNombreEst").textContent = modulo?.titulo || "";
  mostrarVista("modulo-est");
  await cargarContenidoEstudiante(moduloId);
  await cargarActividadesEstudiante(moduloId, cursoId);
};

async function cargarContenidoEstudiante(moduloId) {
  const { data } = await supabaseClient
    .from("contenidos").select("*").eq("modulo_id", moduloId)
    .order("orden", { ascending: true });

  const el = document.getElementById("listaContenidoEst");
  if (!el) return;

  if (!data || data.length === 0) {
    el.innerHTML = `<p class="sin-datos">Sin contenido aún.</p>`;
    return;
  }

  el.innerHTML = data.map(c => {
    let preview = "";
    if (c.tipo === "texto") {
      preview = `<div class="contenido-texto-preview">${c.cuerpo || ""}</div>`;
    } else if (c.tipo === "video") {
      const videoId = extraerYoutubeId(c.url || "");
      preview = videoId
        ? `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`
        : `<a href="${c.url}" target="_blank">${c.url}</a>`;
    } else if (c.tipo === "archivo") {
      preview = `<a href="${c.url}" target="_blank" class="btn-archivo-link"><i class="fas fa-file-download"></i> ${c.titulo || "Descargar archivo"}</a>`;
    } else if (c.tipo === "enlace") {
      preview = `<a href="${c.url}" target="_blank" class="btn-archivo-link"><i class="fas fa-link"></i> ${c.titulo || c.url}</a>`;
    }

    return `
      <div class="contenido-item">
        <span class="tipo-tag tipo-${c.tipo}"><i class="fas fa-${iconoTipo(c.tipo)}"></i> ${c.tipo}</span>
        ${c.titulo ? `<strong style="display:block;margin-top:.5rem;">${c.titulo}</strong>` : ""}
        ${preview}
      </div>`;
  }).join("");
}

function iconoTipo(tipo) {
  return { texto: "align-left", video: "video", archivo: "file", enlace: "link" }[tipo] || "file";
}

function extraerYoutubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

// ══ ACTIVIDADES (entregar) 
async function cargarActividadesEstudiante(moduloId, cursoId) {
  const { data: { user } } = await supabaseClient.auth.getUser();

  const { data: actividades } = await supabaseClient
    .from("actividades").select("*").eq("modulo_id", moduloId)
    .order("creado_at", { ascending: true });

  const el = document.getElementById("listaActividadesEst");
  if (!el) return;

  if (!actividades || actividades.length === 0) {
    el.innerHTML = `<p class="sin-datos">Sin actividades aún.</p>`;
    return;
  }

  const actividadIds = actividades.map(a => a.id);
  const { data: entregas } = await supabaseClient
    .from("entregas").select("*")
    .in("actividad_id", actividadIds)
    .eq("estudiante_id", user.id);

  const entregasMap = {};
  (entregas || []).forEach(e => entregasMap[e.actividad_id] = e);

  el.innerHTML = actividades.map(a => {
    const entrega = entregasMap[a.id];
    return `
      <div class="item-tarea">
        <div class="meta-fila">
          ${a.fecha_entrega ? `<span class="vence-tag ${urgencia(a.fecha_entrega)}">Vence: ${formatFecha(a.fecha_entrega)}</span>` : ""}
          ${entrega ? `<span class="curso-tag" style="background:#e0f7e9;color:#1b7a3e;"><i class="fas fa-check"></i> Entregado</span>` : ""}
        </div>
        <strong>${a.titulo}</strong>
        <p>${a.descripcion || ""}</p>
        ${a.puntos ? `<span style="font-size:.8rem;color:var(--azul2);font-weight:700;">${a.puntos} pts</span>` : ""}

${entrega ? `
  <div class="entrega-info">
    <p style="font-size:.82rem;color:var(--texto2);margin-top:.6rem;">
      <i class="fas fa-paper-plane"></i> Entregado el ${formatFecha(entrega.entregado_at)}
    </p>
    ${entrega.calificacion !== null ? `<p style="font-size:.85rem;color:var(--azul2);font-weight:700;margin-top:.3rem;">Calificación: ${entrega.calificacion} pts</p>` : `<p style="font-size:.8rem;color:var(--texto2);margin-top:.3rem;">Pendiente de calificar</p>`}
    ${entrega.comentario ? `<p style="font-size:.82rem;color:var(--texto2);margin-top:.3rem;"><i class="fas fa-comment"></i> ${entrega.comentario}</p>` : ""}
    ${!a.fecha_entrega || new Date(a.fecha_entrega) >= new Date() ? `
      <div style="display:flex;gap:.5rem;margin-top:.8rem;">
        <button class="btn-icono" onclick="editarEntregaActividad('${entrega.id}','${a.id}')" title="Editar entrega">
          <i class="fas fa-pen"></i>
        </button>
        <button class="btn-peligro btn-mini" onclick="eliminarEntregaActividad('${entrega.id}','${a.id}','${moduloId}','${cursoId}')" title="Eliminar entrega">
          <i class="fas fa-trash"></i>
        </button>
      </div>` : `
      <p style="font-size:.76rem;color:#c62828;margin-top:.6rem;">
        <i class="fas fa-lock"></i> Plazo vencido, no puedes modificar.
      </p>`}
  </div>
` : `
  <div class="form-entrega">
    <textarea id="texto-${a.id}" rows="2" placeholder="Escribe tu respuesta (opcional)..." style="width:100%;margin-top:.6rem;padding:.6rem;border:1.5px solid var(--gris-borde);border-radius:8px;font-family:inherit;"></textarea>
    <input type="file" id="archivo-${a.id}" style="margin-top:.5rem;">
    <button class="btn-primario btn-sm" style="margin-top:.6rem;" onclick="entregarActividad('${a.id}')">
      <i class="fas fa-paper-plane"></i> Entregar
    </button>
  </div>
`}
</div>`;
  }).join("");
}

window.entregarActividad = async function(actividadId) {
  const { data: { user } } = await supabaseClient.auth.getUser();
  const texto   = document.getElementById(`texto-${actividadId}`)?.value.trim();
  const fileEl  = document.getElementById(`archivo-${actividadId}`);
  const file    = fileEl?.files?.[0];

  let urlArchivo = null;

  if (file) {
    const ext      = file.name.split(".").pop();
    const fileName = `entregas/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabaseClient.storage
      .from("cursos").upload(fileName, file, { upsert: false });
    if (uploadError) { alert("Error al subir archivo: " + uploadError.message); return; }
    const { data: { publicUrl } } = supabaseClient.storage.from("cursos").getPublicUrl(fileName);
    urlArchivo = publicUrl;
  }

  if (!texto && !urlArchivo) { alert("Escribe algo o sube un archivo antes de entregar."); return; }

  const { error } = await supabaseClient.from("entregas").insert({
    actividad_id: actividadId, estudiante_id: user.id,
    texto: texto || null, url_archivo: urlArchivo
  });

  if (error) { alert("Error al entregar: " + error.message); return; }

  alert("¡Actividad entregada correctamente!");
  // Recargar actividades del módulo actual
  const moduloNombre = document.getElementById("moduloNombreEst")?.textContent;
  location.reload();
};

// ══ ASIDE 
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
          <span class="curso-tag">${a.cursoNombre}</span>
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
          <span class="curso-tag">${a.cursoNombre}</span>
        </div>`).join("")
    : `<p class="aside-vacio">Sin archivos</p>`;
}

// ══ VISTAS GENERALES 
function renderAnuncios(anuncios) {
  const el = document.getElementById("listaAnuncios");
  if (!el) return;
  el.innerHTML = anuncios.length
    ? anuncios.map(a => `
        <div class="item-anuncio">
          <div class="meta-fila">
            <span class="curso-tag">${a.cursoNombre}</span>
            <span class="meta-fecha">${formatFecha(a.creado_at)}</span>
          </div>
          <strong>${a.titulo}</strong>
          <p>${a.contenido}</p>
        </div>`).join("")
    : `<p class="sin-datos">Sin anuncios en tus cursos.</p>`;
}

async function renderTareas(tareas) {
  const el = document.getElementById("listaTareas");
  if (!el) return;

  if (!tareas || tareas.length === 0) {
    el.innerHTML = `<p class="sin-datos">Sin tareas.</p>`;
    return;
  }

  const { data: { user } } = await supabaseClient.auth.getUser();

  // Traer entregas de tareas del estudiante
  const tareaIds = tareas.map(t => t.id);
  const { data: entregas } = await supabaseClient
    .from("entregas_tareas")
    .select("*")
    .in("tarea_id", tareaIds)
    .eq("estudiante_id", user.id);

  const entregasMap = {};
  (entregas || []).forEach(e => entregasMap[e.tarea_id] = e);

  el.innerHTML = tareas.map(t => {
    const entrega = entregasMap[t.id];
    return `
      <div class="item-tarea">
        <div class="meta-fila">
          <span class="curso-tag">${t.cursoNombre}</span>
          ${t.fecha_entrega ? `<span class="vence-tag ${urgencia(t.fecha_entrega)}">Vence: ${formatFecha(t.fecha_entrega)}</span>` : ""}
        </div>
        <strong>${t.titulo}</strong>
        <p>${t.descripcion || ""}</p>
        ${t.puntos ? `<span style="font-size:.8rem;color:var(--azul2);font-weight:700;">${t.puntos} pts</span>` : ""}

  ${entrega ? `
          <div class="entrega-info" style="margin-top:.8rem;padding:.8rem;background:var(--gris-bg);border-radius:10px;border:1.5px solid var(--gris-borde);">
            <p style="font-size:.82rem;color:#1b7a3e;font-weight:700;">
              <i class="fas fa-check-circle"></i> Entregado el ${formatFecha(entrega.entregado_at)}
            </p>
            ${entrega.texto ? `<p style="font-size:.83rem;color:var(--texto2);margin-top:.4rem;">${entrega.texto}</p>` : ""}
            ${entrega.calificacion !== null && entrega.calificacion !== undefined
              ? `<p style="font-size:.85rem;color:var(--azul2);font-weight:700;margin-top:.4rem;">Calificación: ${entrega.calificacion} pts</p>`
              : `<p style="font-size:.8rem;color:var(--texto2);margin-top:.4rem;">Pendiente de calificar</p>`}
            ${entrega.comentario ? `<p style="font-size:.82rem;color:var(--texto2);margin-top:.3rem;"><i class="fas fa-comment"></i> ${entrega.comentario}</p>` : ""}
            ${!t.fecha_entrega || new Date(t.fecha_entrega) >= new Date() ? `
              <div style="display:flex;gap:.5rem;margin-top:.8rem;">
                <button class="btn-icono" onclick="editarEntregaTarea('${entrega.id}','${t.id}')" title="Editar entrega">
                  <i class="fas fa-pen"></i>
                </button>
                <button class="btn-peligro btn-mini" onclick="eliminarEntregaTarea('${entrega.id}','${t.id}')" title="Eliminar entrega">
                  <i class="fas fa-trash"></i>
                </button>
              </div>` : `
              <p style="font-size:.76rem;color:#c62828;margin-top:.6rem;">
                <i class="fas fa-lock"></i> Plazo vencido, no puedes modificar.
              </p>`}
          </div>
        ` : `
          <div class="form-entrega" style="margin-top:.8rem;display:flex;flex-direction:column;gap:.5rem;">
            <textarea id="texto-tarea-${t.id}" rows="2" placeholder="Escribe tu respuesta (opcional)..."
              style="width:100%;padding:.6rem;border:1.5px solid var(--gris-borde);border-radius:8px;font-family:inherit;resize:vertical;"></textarea>
            <input type="file" id="archivo-tarea-${t.id}">
            <button class="btn-primario btn-sm" onclick="entregarTarea('${t.id}')">
              <i class="fas fa-paper-plane"></i> Entregar
            </button>
          </div>
        `}
      </div>`;
  }).join("");
}

function renderArchivos(archivos) {
  const el = document.getElementById("listaArchivos");
  if (!el) return;
  el.innerHTML = archivos.length
    ? archivos.map(a => `
        <div class="item-archivo">
          <span class="curso-tag">${a.cursoNombre}</span>
          <a href="${a.url}" target="_blank"><i class="fas fa-file"></i> ${a.nombre_archivo}</a>
          <span class="meta-fecha">${formatFecha(a.creado_at)}</span>
        </div>`).join("")
    : `<p class="sin-datos">Sin archivos.</p>`;
}

function llenarFiltros(cursos) {
  ["filtroAnuncios","filtroArchivos","filtroTareas"].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    while (sel.options.length > 1) sel.remove(1);
    cursos.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nombre;
      sel.appendChild(opt);
    });
  });
}

// ══ UNIRSE A CURSO 
function initFormCodigo() {
  const form = document.getElementById("formCodigo");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const codigo = document.getElementById("inputCodigo")?.value.trim().toUpperCase();
    const alerta = document.getElementById("alertaCodigo");
    const errEl  = document.getElementById("errCodigo");

    if (!codigo) { if (errEl) errEl.textContent = "Ingresa un código."; return; }
    if (errEl) errEl.textContent = "";

    const { data: { user } } = await supabaseClient.auth.getUser();

    const { data: curso, error: errBuscar } = await supabaseClient
      .from("cursos").select("id, nombre").eq("codigo", codigo).single();

    if (errBuscar || !curso) {
      mostrarAlerta(alerta, "error", "Código incorrecto. Verifica con tu docente.");
      return;
    }

    const { data: yaInscrito } = await supabaseClient
      .from("inscripciones").select("id")
      .eq("curso_id", curso.id).eq("estudiante_id", user.id).single();

    if (yaInscrito) {
      mostrarAlerta(alerta, "info", "Ya estás inscrito en este curso.");
      return;
    }

    const { error: errInscribir } = await supabaseClient
      .from("inscripciones").insert({ curso_id: curso.id, estudiante_id: user.id });

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

// ══ PERFIL FORM
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

// ══ NAV 
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
  document.getElementById("btnVolverCursos")?.addEventListener("click", () => mostrarVista("cursos"));
  document.getElementById("btnVolverDetalle")?.addEventListener("click", () => mostrarVista("detalle"));
}

function initTabs() {
  document.addEventListener("click", e => {
    const btn = e.target.closest(".tab-contenido-btn");
    if (!btn) return;
    document.querySelectorAll(".tab-contenido-btn").forEach(b => b.classList.remove("activa"));
    document.querySelectorAll(".tab-contenido-panel").forEach(p => p.classList.add("oculto"));
    btn.classList.add("activa");
    document.getElementById(`panel-${btn.dataset.panel}`)?.classList.remove("oculto");
  });

  document.getElementById("filtroTareas")?.addEventListener("change", function() {
    const cursoId = this.value;
    const todas = window._tareasCache || [];
    renderTareas(cursoId ? todas.filter(t => t.curso_id === cursoId) : todas);
  });

  document.getElementById("filtroAnuncios")?.addEventListener("change", function() {
    const cursoId = this.value;
    const todos = window._anunciosCache || [];
    renderAnuncios(cursoId ? todos.filter(a => a.curso_id === cursoId) : todos);
  });

  document.getElementById("filtroArchivos")?.addEventListener("change", function() {
    const cursoId = this.value;
    const todos = window._archivosCache || [];
    renderArchivos(cursoId ? todos.filter(a => a.curso_id === cursoId) : todos);
  });
}

window.mostrarVista = function(nombre) {
  document.querySelectorAll(".vista").forEach(v => v.classList.add("oculto"));
  document.getElementById(`vista-${nombre}`)?.classList.remove("oculto");
  document.querySelectorAll(".nav-item[data-vista]").forEach(b => {
    b.classList.toggle("activo", b.dataset.vista === nombre);
  });
    if (nombre === "labs") cargarLabsEstudiante();
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

// ══ UTILS 
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

window.entregarTarea = async function(tareaId) {
  const { data: { user } } = await supabaseClient.auth.getUser();
  const texto  = document.getElementById(`texto-tarea-${tareaId}`)?.value.trim();
  const fileEl = document.getElementById(`archivo-tarea-${tareaId}`);
  const file   = fileEl?.files?.[0];

  let urlArchivo = null;

  if (file) {
    const ext      = file.name.split(".").pop();
    const fileName = `entregas-tareas/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabaseClient.storage
      .from("cursos").upload(fileName, file, { upsert: false });
    if (uploadError) { alert("Error al subir archivo: " + uploadError.message); return; }
    const { data: { publicUrl } } = supabaseClient.storage.from("cursos").getPublicUrl(fileName);
    urlArchivo = publicUrl;
  }

  if (!texto && !urlArchivo) {
    alert("Escribe algo o sube un archivo antes de entregar.");
    return;
  }

  const { error } = await supabaseClient.from("entregas_tareas").insert({
    tarea_id:     tareaId,
    estudiante_id: user.id,
    texto:        texto || null,
    url_archivo:  urlArchivo
  });

  if (error) { alert("Error al entregar: " + error.message); return; }

  alert("¡Tarea entregada correctamente!");
  await cargarDatos();
  mostrarVista("tareas");
};

// ══ EDITAR / ELIMINAR ENTREGAS ACTIVIDADES ════════════════════════════════════
window.editarEntregaActividad = function(entregaId, actividadId) {
  document.getElementById("modalEditEntrega")?.remove();

  const modal = document.createElement("div");
  modal.id        = "modalEditEntrega";
  modal.className = "modal-overlay activo";
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-box-header">
        <h3><i class="fas fa-pen" style="color:var(--rosa2)"></i> Editar entrega</h3>
        <button class="btn-icono" onclick="this.closest('.modal-overlay').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-edit-body">
        <div class="campo-grupo">
          <label>Tu respuesta</label>
          <textarea id="editTextoEntrega" rows="4" placeholder="Escribe tu respuesta..."></textarea>
        </div>
        <div class="campo-grupo">
          <label>Cambiar archivo (opcional)</label>
          <input type="file" id="editArchivoEntrega">
        </div>
        <div id="alertaEditEntrega" class="alerta"></div>
        <button class="btn-primario" id="btnGuardarEditEntrega">
          <i class="fas fa-floppy-disk"></i> Guardar cambios
        </button>
      </div>
    </div>`;

  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);

  document.getElementById("btnGuardarEditEntrega").addEventListener("click", async () => {
    const texto  = document.getElementById("editTextoEntrega")?.value.trim();
    const fileEl = document.getElementById("editArchivoEntrega");
    const file   = fileEl?.files?.[0];
    const alerta = document.getElementById("alertaEditEntrega");
    const updates = {};

    if (texto) updates.texto = texto;

    if (file) {
      const ext      = file.name.split(".").pop();
      const fileName = `entregas/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabaseClient.storage
        .from("cursos").upload(fileName, file, { upsert: false });
      if (uploadError) { mostrarAlerta(alerta, "error", "Error al subir archivo."); return; }
      const { data: { publicUrl } } = supabaseClient.storage.from("cursos").getPublicUrl(fileName);
      updates.url_archivo = publicUrl;
    }

    if (!texto && !file) { mostrarAlerta(alerta, "error", "Escribe algo o sube un archivo."); return; }

    const { error } = await supabaseClient.from("entregas").update(updates).eq("id", entregaId);
    if (error) { mostrarAlerta(alerta, "error", "Error al guardar."); return; }

    mostrarAlerta(alerta, "ok", "¡Entrega actualizada!");
    setTimeout(() => { modal.remove(); location.reload(); }, 900);
  });
};

window.eliminarEntregaActividad = async function(entregaId, actividadId, moduloId, cursoId) {
  if (!confirm("¿Eliminar tu entrega? Podrás volver a entregar antes del plazo.")) return;
  const { error } = await supabaseClient.from("entregas").delete().eq("id", entregaId);
  if (error) { alert("Error al eliminar."); return; }
  await cargarActividadesEstudiante(moduloId, cursoId);
};

// ══ EDITAR / ELIMINAR ENTREGAS TAREAS ════════════════════════════════════════
window.editarEntregaTarea = function(entregaId, tareaId) {
  document.getElementById("modalEditEntregaTarea")?.remove();

  const modal = document.createElement("div");
  modal.id        = "modalEditEntregaTarea";
  modal.className = "modal-overlay activo";
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-box-header">
        <h3><i class="fas fa-pen" style="color:var(--rosa2)"></i> Editar entrega</h3>
        <button class="btn-icono" onclick="this.closest('.modal-overlay').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-edit-body">
        <div class="campo-grupo">
          <label>Tu respuesta</label>
          <textarea id="editTextoEntregaTarea" rows="4" placeholder="Escribe tu respuesta..."></textarea>
        </div>
        <div class="campo-grupo">
          <label>Cambiar archivo (opcional)</label>
          <input type="file" id="editArchivoEntregaTarea">
        </div>
        <div id="alertaEditEntregaTarea" class="alerta"></div>
        <button class="btn-primario" id="btnGuardarEditEntregaTarea">
          <i class="fas fa-floppy-disk"></i> Guardar cambios
        </button>
      </div>
    </div>`;

  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);

  document.getElementById("btnGuardarEditEntregaTarea").addEventListener("click", async () => {
    const texto  = document.getElementById("editTextoEntregaTarea")?.value.trim();
    const fileEl = document.getElementById("editArchivoEntregaTarea");
    const file   = fileEl?.files?.[0];
    const alerta = document.getElementById("alertaEditEntregaTarea");
    const updates = {};

    if (texto) updates.texto = texto;

    if (file) {
      const ext      = file.name.split(".").pop();
      const fileName = `entregas-tareas/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabaseClient.storage
        .from("cursos").upload(fileName, file, { upsert: false });
      if (uploadError) { mostrarAlerta(alerta, "error", "Error al subir archivo."); return; }
      const { data: { publicUrl } } = supabaseClient.storage.from("cursos").getPublicUrl(fileName);
      updates.url_archivo = publicUrl;
    }

    if (!texto && !file) { mostrarAlerta(alerta, "error", "Escribe algo o sube un archivo."); return; }

    const { error } = await supabaseClient.from("entregas_tareas").update(updates).eq("id", entregaId);
    if (error) { mostrarAlerta(alerta, "error", "Error al guardar."); return; }

    mostrarAlerta(alerta, "ok", "¡Entrega actualizada!");
    setTimeout(() => { modal.remove(); cargarDatos(); }, 900);
  });
};

window.eliminarEntregaTarea = async function(entregaId, tareaId) {
  if (!confirm("¿Eliminar tu entrega? Podrás volver a entregar antes del plazo.")) return;
  const { error } = await supabaseClient.from("entregas_tareas").delete().eq("id", entregaId);
  if (error) { alert("Error al eliminar."); return; }
  await cargarDatos();
};
// ══ LABORATORIOS ══════════════════════════════════════════════════════════════
async function cargarLabsEstudiante() {
  const el = document.getElementById("gridLabsEst");
  if (!el) return;

  el.innerHTML = `<p class="sin-datos"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>`;

  const { data: labs } = await supabaseClient
    .from("labs").select("*").eq("publicado", true)
    .order("creado_at", { ascending: true });

  if (!labs || labs.length === 0) {
    el.innerHTML = `<p class="sin-datos"><i class="fas fa-flask"></i><br>No hay laboratorios disponibles aún.</p>`;
    return;
  }

  el.innerHTML = labs.map(lab => `
    <div class="lab-panel-card">
      <div class="lab-panel-icon">${lab.icono}</div>
      <div class="lab-panel-info">
        <h3>${lab.nombre}</h3>
        <p>${lab.descripcion || ""}</p>
      </div>
      <a href="${lab.url}" target="_blank" class="btn-primario btn-sm">
        <i class="fas fa-external-link-alt"></i> Abrir laboratorio
      </a>
    </div>
  `).join("");
}