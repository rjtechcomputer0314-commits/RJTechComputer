let cursosDocente = [];
let cursoActivo   = null;
let moduloActivo  = null;

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
    .from("perfiles").select("*").eq("user_id", user.id);

  if (!perfiles || perfiles.length === 0) return;
  const perfil = perfiles[0];
  const nombreCompleto = `${perfil.nombre} ${perfil.apellido}`;

  const sideNombre = document.getElementById("sideNombre");
  if (sideNombre) sideNombre.textContent = nombreCompleto;

  const pNombre  = document.getElementById("pNombre");
  const pApellido = document.getElementById("pApellido");
  const pEmail   = document.getElementById("pEmail");
  const pDesde   = document.getElementById("perfilDesde");
  const pNombreDisplay = document.getElementById("perfilNombreDisplay");
  const pEmailDisplay  = document.getElementById("perfilEmailDisplay");

  if (pNombre)        pNombre.value        = perfil.nombre;
  if (pApellido)      pApellido.value      = perfil.apellido;
  if (pEmail)         pEmail.value         = user.email;
  if (pDesde)         pDesde.textContent   = `Miembro desde ${formatFecha(user.created_at)}`;
  if (pNombreDisplay) pNombreDisplay.textContent = nombreCompleto;
  if (pEmailDisplay)  pEmailDisplay.textContent  = user.email;
}

/// ══ CARGAR CURSOS ═════════════════════════════════════════════════════════════
async function cargarCursos() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: cursos } = await supabaseClient
    .from("cursos").select("*").eq("docente_id", user.id)
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
        <button class="btn-visibilidad ${c.publicado ? 'publicado' : ''}"
          onclick="toggleVisibilidad(event,'${c.id}',${c.publicado})"
          title="${c.publicado ? 'Visible para estudiantes' : 'Oculto para estudiantes'}">
          <i class="fas fa-${c.publicado ? 'eye' : 'eye-slash'}"></i>
          ${c.publicado ? 'Visible' : 'Oculto'}
        </button>
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

  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("activa"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("oculto"));
  document.querySelector(".tab-btn[data-tab='alumnos']")?.classList.add("activa");
  document.getElementById("tab-alumnos")?.classList.remove("oculto");

  await cargarAlumnosCurso(cursoId);
  await cargarModulos(cursoId);
  await cargarAnunciosCurso(cursoId);
  await cargarArchivosCurso(cursoId);
  await cargarTareasCurso(cursoId);
  initAccionesCurso(cursoId);
};

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

// ══ ALUMNOS ═══════════════════════════════════════════════════════════════════
async function cargarAlumnosCurso(cursoId) {
  const { data } = await supabaseClient
    .from("inscripciones").select("estudiante_id").eq("curso_id", cursoId);

  const el = document.getElementById("listaAlumnos");
  if (!el) return;

  if (!data || data.length === 0) {
    el.innerHTML = `<p class="sin-datos">Sin estudiantes inscritos.</p>`;
    return;
  }

  const ids = data.map(i => i.estudiante_id);
  const { data: perfiles } = await supabaseClient
    .from("perfiles").select("user_id, nombre, apellido").in("user_id", ids);

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

// ══ MÓDULOS ═══════════════════════════════════════════════════════════════════
async function cargarModulos(cursoId) {
  const { data: modulos } = await supabaseClient
    .from("modulos").select("*").eq("curso_id", cursoId)
    .order("orden", { ascending: true });

  const el = document.getElementById("listaModulos");
  if (!el) return;

  if (!modulos || modulos.length === 0) {
    el.innerHTML = `<p class="sin-datos">No hay módulos aún. Crea el primero.</p>`;
    return;
  }

  el.innerHTML = modulos.map(m => `
    <div class="modulo-card" id="modulo-${m.id}">
      <div class="modulo-header">
        <div class="modulo-info">
          <i class="fas fa-book-open" style="color:var(--rosa2)"></i>
          <strong>${m.titulo}</strong>
        </div>
        <div class="modulo-acciones">
          <button class="btn-icono" onclick="verContenidoModulo('${m.id}','${cursoId}')" title="Ver contenido">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-peligro btn-mini" onclick="eliminarModulo('${m.id}','${cursoId}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

window.verContenidoModulo = async function(moduloId, cursoId) {
  moduloActivo = moduloId;
  const { data: modulo } = await supabaseClient
    .from("modulos").select("*").eq("id", moduloId).single();

  document.getElementById("moduloNombre").textContent = modulo?.titulo || "";
  mostrarVista("modulo");
  await cargarContenidos(moduloId);
  await cargarActividadesModulo(moduloId, cursoId);
  initAccionesModulo(moduloId, cursoId);
};

window.eliminarModulo = async function(moduloId, cursoId) {
  if (!confirm("¿Eliminar este módulo y todo su contenido?")) return;
  await supabaseClient.from("modulos").delete().eq("id", moduloId);
  await cargarModulos(cursoId);
};

// ══ CONTENIDOS DEL MÓDULO ═════════════════════════════════════════════════════
async function cargarContenidos(moduloId) {
  const { data } = await supabaseClient
    .from("contenidos").select("*").eq("modulo_id", moduloId)
    .order("orden", { ascending: true });

  const el = document.getElementById("listaContenidos");
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
        <div class="meta-fila">
          <span class="tipo-tag tipo-${c.tipo}"><i class="fas fa-${iconoTipo(c.tipo)}"></i> ${c.tipo}</span>
          <div style="display:flex;gap:.35rem;">
            <button class="btn-icono btn-edit-cnt" onclick="editarContenido('${c.id}','${moduloId}')" title="Editar">
              <i class="fas fa-pen"></i>
            </button>
            <button class="btn-peligro btn-mini" onclick="eliminarContenido('${c.id}','${moduloId}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        ${c.titulo ? `<strong>${c.titulo}</strong>` : ""}
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

window.editarContenido = async function(id, moduloId) {
  // Busca directo en Supabase, sin depender del caché
  const { data: c, error } = await supabaseClient
    .from("contenidos").select("*").eq("id", id).single();

  if (error || !c) {
    console.log("No se encontró el contenido:", error);
    return;
  }

  document.getElementById("modalEditContenido")?.remove();

  let camposExtra = "";
  if (c.tipo === "texto") {
    camposExtra = `
      <div class="campo-grupo">
        <label>Contenido *</label>
        <textarea id="editCuerpo" rows="5">${c.cuerpo || ""}</textarea>
      </div>`;
  } else if (c.tipo === "video" || c.tipo === "enlace") {
    camposExtra = `
      <div class="campo-grupo">
        <label>URL *</label>
        <input type="url" id="editUrl" value="${c.url || ""}">
      </div>`;
  } else if (c.tipo === "archivo") {
    camposExtra = `
      <p class="campo-nota" style="margin-bottom:.5rem;">
        <i class="fas fa-info-circle"></i>
        Para cambiar el archivo elimina este y sube uno nuevo. Aquí solo puedes editar el título.
      </p>`;
  }

  const modal = document.createElement("div");
  modal.id        = "modalEditContenido";
  modal.className = "modal-overlay activo";
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-box-header">
        <h3><i class="fas fa-pen" style="color:var(--rosa2)"></i> Editar ${c.tipo}</h3>
        <button class="btn-icono" onclick="document.getElementById('modalEditContenido').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-edit-body">
        <div class="campo-grupo">
          <label>Título</label>
          <input type="text" id="editTitulo" value="${c.titulo || ""}" placeholder="Título (opcional)">
        </div>
        ${camposExtra}
        <div id="alertaEditContenido" class="alerta"></div>
        <button class="btn-primario" onclick="guardarEdicionContenido('${id}','${moduloId}','${c.tipo}')">
          <i class="fas fa-floppy-disk"></i> Guardar cambios
        </button>
      </div>
    </div>`;

  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
};

window.guardarEdicionContenido = async function(id, moduloId, tipo) {
  const titulo = document.getElementById("editTitulo")?.value.trim();
  const alerta = document.getElementById("alertaEditContenido");
  const updates = { titulo: titulo || null };

  if (tipo === "texto") {
    const cuerpo = document.getElementById("editCuerpo")?.value.trim();
    if (!cuerpo) { mostrarAlerta(alerta, "error", "El contenido no puede estar vacío."); return; }
    updates.cuerpo = cuerpo;
  } else if (tipo === "video" || tipo === "enlace") {
    const url = document.getElementById("editUrl")?.value.trim();
    if (!url) { mostrarAlerta(alerta, "error", "La URL es obligatoria."); return; }
    updates.url = url;
  }

  const { error } = await supabaseClient.from("contenidos").update(updates).eq("id", id);
  if (error) { mostrarAlerta(alerta, "error", "Error al guardar."); return; }

  mostrarAlerta(alerta, "ok", "¡Cambios guardados!");
  setTimeout(() => {
    document.getElementById("modalEditContenido")?.remove();
    cargarContenidos(moduloId);
  }, 900);
};

// ══ ACTIVIDADES DEL MÓDULO ════════════════════════════════════════════════════
async function cargarActividadesModulo(moduloId, cursoId) {
  const { data } = await supabaseClient
    .from("actividades").select("*").eq("modulo_id", moduloId)
    .order("creado_at", { ascending: true });

  const el = document.getElementById("listaActividadesModulo");
  if (!el) return;

  if (!data || data.length === 0) {
    el.innerHTML = `<p class="sin-datos">Sin actividades aún.</p>`;
    return;
  }

  el.innerHTML = data.map(a => `
    <div class="item-tarea">
      <div class="meta-fila">
        ${a.fecha_entrega ? `<span class="vence-tag ${urgencia(a.fecha_entrega)}">Vence: ${formatFecha(a.fecha_entrega)}</span>` : ""}
        <div style="display:flex;gap:.4rem;">
          <button class="btn-icono" onclick="verEntregas('${a.id}','${a.titulo}')" title="Ver entregas">
            <i class="fas fa-inbox"></i>
          </button>
          <button class="btn-peligro btn-mini" onclick="eliminarActividad('${a.id}','${moduloId}','${cursoId}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <strong>${a.titulo}</strong>
      <p>${a.descripcion || ""}</p>
      ${a.puntos ? `<span style="font-size:.8rem;color:var(--azul2);font-weight:700;">${a.puntos} pts</span>` : ""}
    </div>
  `).join("");
}

window.eliminarActividad = async function(id, moduloId, cursoId) {
  if (!confirm("¿Eliminar esta actividad?")) return;
  await supabaseClient.from("actividades").delete().eq("id", id);
  await cargarActividadesModulo(moduloId, cursoId);
};

// ══ VER ENTREGAS ══════════════════════════════════════════════════════════════
window.verEntregas = async function(actividadId, titulo) {
  const el       = document.getElementById("listaEntregas");
  const tituloEl = document.getElementById("entregasTitulo");

  if (tituloEl) tituloEl.textContent = `Entregas: ${titulo}`;
  if (el) el.innerHTML = `<p class="sin-datos"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>`;

  document.getElementById("modalEntregas")?.classList.add("activo");

  const { data: entregas, error } = await supabaseClient
    .from("entregas").select("*").eq("actividad_id", actividadId);

  if (error || !entregas || entregas.length === 0) {
    if (el) el.innerHTML = `<p class="sin-datos">Sin entregas aún.</p>`;
    return;
  }

  const ids = entregas.map(e => e.estudiante_id);
  let perfilesMap = {};
  if (ids.length > 0) {
    const { data: perfiles } = await supabaseClient
      .from("perfiles").select("user_id, nombre, apellido").in("user_id", ids);
    (perfiles || []).forEach(p => perfilesMap[p.user_id] = p);
  }

  if (!el) return;

  el.innerHTML = entregas.map(e => {
    const p = perfilesMap[e.estudiante_id];
    const yaCalificado = e.calificacion !== null && e.calificacion !== undefined;
    return `
      <div class="item-entrega">
        <div class="meta-fila">
          <strong>${p?.nombre || "Estudiante"} ${p?.apellido || ""}</strong>
          <span class="meta-fecha">${formatFecha(e.entregado_at)}</span>
          ${yaCalificado
            ? `<span class="curso-tag" style="background:#e0f7e9;color:#1b7a3e;"><i class="fas fa-check-circle"></i> Calificado</span>`
            : `<span class="curso-tag" style="background:#fff3cd;color:#856404;"><i class="fas fa-clock"></i> Pendiente</span>`}
        </div>
        ${e.texto ? `<p style="font-size:.85rem;color:var(--texto2);margin:.4rem 0;">${e.texto}</p>` : ""}
        ${e.url_archivo ? `<a href="${e.url_archivo}" target="_blank" class="btn-archivo-link"><i class="fas fa-file"></i> Ver archivo</a>` : ""}
        ${yaCalificado ? `
          <div style="margin-top:.8rem;padding:.8rem;background:#e0f7e9;border-radius:10px;border:1.5px solid #a8ddb8;">
            <p style="font-size:.85rem;color:#1b7a3e;font-weight:700;"><i class="fas fa-star"></i> Calificación: ${e.calificacion} pts</p>
            ${e.comentario ? `<p style="font-size:.82rem;color:#1b7a3e;margin-top:.3rem;"><i class="fas fa-comment"></i> ${e.comentario}</p>` : ""}
<button class="btn-primario btn-sm" style="margin-top:.8rem;" onclick="recalificarEntrega('${e.id}')">
  <i class="fas fa-pen"></i> Editar calificación
</button>
          </div>` : `
          <div class="calificar-row" style="display:flex;gap:.6rem;align-items:center;margin-top:.8rem;flex-wrap:wrap;">
            <input type="number" placeholder="Puntos" min="0" max="100"
              id="cal-${e.id}" style="width:80px;padding:.3rem .5rem;border:1.5px solid var(--gris-borde);border-radius:8px;">
            <input type="text" placeholder="Comentario"
              id="com-${e.id}" style="flex:1;padding:.3rem .6rem;border:1.5px solid var(--gris-borde);border-radius:8px;">
            <button class="btn-primario btn-sm" onclick="calificarEntrega('${e.id}')">
              <i class="fas fa-check"></i> Calificar
            </button>
          </div>`}
      </div>`;
  }).join("");
};

window.calificarEntrega = async function(entregaId) {
  const cal = document.getElementById(`cal-${entregaId}`)?.value;
  const com = document.getElementById(`com-${entregaId}`)?.value;
  if (!cal) { alert("Ingresa una calificación."); return; }
  const { error } = await supabaseClient.from("entregas").update({
    calificacion: parseInt(cal),
    comentario: com || null
  }).eq("id", entregaId);
  if (error) { alert("Error al calificar."); return; }
  alert("¡Calificación guardada!");
  // recargar el modal
  const tituloEl = document.getElementById("entregasTitulo");
  const titulo = tituloEl?.textContent?.replace("Entregas: ", "") || "";
  await verEntregas(entregaId, titulo); // esto no funciona bien, mejor recarga
  location.reload();
};

window.recalificarEntrega = function(entregaId) {
  const btnEditar = document.querySelector(`button[onclick="recalificarEntrega('${entregaId}')"]`);
  const div = document.createElement("div");
  div.style.cssText = "margin-top:.8rem;display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;";
  div.innerHTML = `
    <input type="number" placeholder="Puntos" min="0" max="100"
      id="cal-${entregaId}" style="width:80px;padding:.3rem .5rem;border:1.5px solid var(--gris-borde);border-radius:8px;">
    <input type="text" placeholder="Comentario"
      id="com-${entregaId}" style="flex:1;padding:.3rem .6rem;border:1.5px solid var(--gris-borde);border-radius:8px;">
    <button class="btn-primario btn-sm" onclick="calificarEntrega('${entregaId}')">
      <i class="fas fa-check"></i> Guardar
    </button>`;
  btnEditar?.closest("div")?.replaceWith(div);
};
// ══ ACCIONES MÓDULO ═══════════════════════════════════════════════════════════
function initAccionesModulo(moduloId, cursoId) {

  // Agregar contenido texto
  clonar("btnAgregarTexto");
  document.getElementById("btnAgregarTexto")?.addEventListener("click", async () => {
    const titulo  = document.getElementById("textoTitulo")?.value.trim();
    const cuerpo  = document.getElementById("textoCuerpo")?.value.trim();
    const alerta  = document.getElementById("alertaContenido");
    if (!cuerpo) { mostrarAlerta(alerta, "error", "Escribe el contenido."); return; }
    const { error } = await supabaseClient.from("contenidos").insert({
      modulo_id: moduloId, tipo: "texto", titulo: titulo || null, cuerpo,
      orden: 0
    });
    if (error) { mostrarAlerta(alerta, "error", "Error al guardar."); return; }
    mostrarAlerta(alerta, "ok", "Texto agregado.");
    document.getElementById("textoTitulo").value = "";
    document.getElementById("textoCuerpo").value = "";
    await cargarContenidos(moduloId);
  });

  // Agregar video YouTube
  clonar("btnAgregarVideo");
  document.getElementById("btnAgregarVideo")?.addEventListener("click", async () => {
    const titulo = document.getElementById("videoTitulo")?.value.trim();
    const url    = document.getElementById("videoUrl")?.value.trim();
    const alerta = document.getElementById("alertaContenido");
    if (!url) { mostrarAlerta(alerta, "error", "Ingresa la URL del video."); return; }
    const { error } = await supabaseClient.from("contenidos").insert({
      modulo_id: moduloId, tipo: "video", titulo: titulo || null, url, orden: 0
    });
    if (error) { mostrarAlerta(alerta, "error", "Error al guardar."); return; }
    mostrarAlerta(alerta, "ok", "Video agregado.");
    document.getElementById("videoTitulo").value = "";
    document.getElementById("videoUrl").value    = "";
    await cargarContenidos(moduloId);
  });

  // Agregar archivo (subida a Supabase Storage)
  clonar("btnAgregarArchivo");
  document.getElementById("btnAgregarArchivo")?.addEventListener("click", async () => {
    const titulo  = document.getElementById("archivoTitulo")?.value.trim();
    const fileEl  = document.getElementById("archivoFile");
    const alerta  = document.getElementById("alertaContenido");
    const file    = fileEl?.files?.[0];
    if (!file) { mostrarAlerta(alerta, "error", "Selecciona un archivo."); return; }

    const ext      = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from("cursos").upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) { mostrarAlerta(alerta, "error", "Error al subir archivo."); return; }

    const { data: { publicUrl } } = supabaseClient.storage
      .from("cursos").getPublicUrl(fileName);

    const { error } = await supabaseClient.from("contenidos").insert({
      modulo_id: moduloId, tipo: "archivo",
      titulo: titulo || file.name, url: publicUrl, orden: 0
    });
    if (error) { mostrarAlerta(alerta, "error", "Error al guardar."); return; }
    mostrarAlerta(alerta, "ok", "Archivo subido.");
    document.getElementById("archivoTitulo").value = "";
    fileEl.value = "";
    await cargarContenidos(moduloId);
  });

  // Agregar enlace
  clonar("btnAgregarEnlace");
  document.getElementById("btnAgregarEnlace")?.addEventListener("click", async () => {
    const titulo = document.getElementById("enlaceTitulo")?.value.trim();
    const url    = document.getElementById("enlaceUrl")?.value.trim();
    const alerta = document.getElementById("alertaContenido");
    if (!url) { mostrarAlerta(alerta, "error", "Ingresa el enlace."); return; }
    const { error } = await supabaseClient.from("contenidos").insert({
      modulo_id: moduloId, tipo: "enlace",
      titulo: titulo || url, url, orden: 0
    });
    if (error) { mostrarAlerta(alerta, "error", "Error al guardar."); return; }
    mostrarAlerta(alerta, "ok", "Enlace agregado.");
    document.getElementById("enlaceTitulo").value = "";
    document.getElementById("enlaceUrl").value    = "";
    await cargarContenidos(moduloId);
  });

  // Crear actividad
  clonar("btnCrearActividad");
  document.getElementById("btnCrearActividad")?.addEventListener("click", async () => {
    const titulo  = document.getElementById("actTitulo")?.value.trim();
    const desc    = document.getElementById("actDesc")?.value.trim();
    const fecha   = document.getElementById("actFecha")?.value;
    const puntos  = document.getElementById("actPuntos")?.value;
    const alerta  = document.getElementById("alertaActividad");
    if (!titulo) { mostrarAlerta(alerta, "error", "El título es obligatorio."); return; }
    const { error } = await supabaseClient.from("actividades").insert({
      modulo_id: moduloId, curso_id: cursoId, titulo,
      descripcion: desc || null,
      fecha_entrega: fecha || null,
      puntos: puntos ? parseInt(puntos) : null
    });
    if (error) { mostrarAlerta(alerta, "error", "Error al crear."); return; }
    mostrarAlerta(alerta, "ok", "Actividad creada.");
    document.getElementById("actTitulo").value  = "";
    document.getElementById("actDesc").value    = "";
    document.getElementById("actFecha").value   = "";
    document.getElementById("actPuntos").value  = "";
    await cargarActividadesModulo(moduloId, cursoId);
  });
}

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

// ══ TAREAS de los estudiantes ════════════════════════════════════════════════════════════════════
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
          <div style="display:flex;gap:.4rem;">
            <button class="btn-icono" onclick="verEntregasTarea('${t.id}','${t.titulo}')" title="Ver entregas">
              <i class="fas fa-inbox"></i>
            </button>
            <button class="btn-peligro btn-mini" onclick="eliminarTarea('${t.id}','${cursoId}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <strong>${t.titulo}</strong>
        <p>${t.descripcion || ""}</p>
        ${t.puntos ? `<span style="font-size:.8rem;color:var(--azul2);font-weight:700;">${t.puntos} pts</span>` : ""}
      </div>`).join("")
    : `<p class="sin-datos">Sin tareas aún.</p>`;
}

// ══ VER ENTREGAS TAREAS ═══════════════════════════════════════════════════════
window.verEntregasTarea = async function(tareaId, titulo) {
  const el       = document.getElementById("listaEntregas");
  const tituloEl = document.getElementById("entregasTitulo");

  if (tituloEl) tituloEl.textContent = `Entregas: ${titulo}`;
  if (el) el.innerHTML = `<p class="sin-datos"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>`;

  document.getElementById("modalEntregas")?.classList.add("activo");

  const { data: entregas, error } = await supabaseClient
    .from("entregas_tareas").select("*").eq("tarea_id", tareaId);

  if (error || !entregas || entregas.length === 0) {
    if (el) el.innerHTML = `<p class="sin-datos">Sin entregas aún.</p>`;
    return;
  }

  const ids = entregas.map(e => e.estudiante_id);
  let perfilesMap = {};
  if (ids.length > 0) {
    const { data: perfiles } = await supabaseClient
      .from("perfiles").select("user_id, nombre, apellido").in("user_id", ids);
    (perfiles || []).forEach(p => perfilesMap[p.user_id] = p);
  }

  if (!el) return;

  el.innerHTML = entregas.map(e => {
    const p = perfilesMap[e.estudiante_id];
    const yaCalificado = e.calificacion !== null && e.calificacion !== undefined;
    return `
      <div class="item-entrega">
        <div class="meta-fila">
          <strong>${p?.nombre || "Estudiante"} ${p?.apellido || ""}</strong>
          <span class="meta-fecha">${formatFecha(e.entregado_at)}</span>
          ${yaCalificado
            ? `<span class="curso-tag" style="background:#e0f7e9;color:#1b7a3e;"><i class="fas fa-check-circle"></i> Calificado</span>`
            : `<span class="curso-tag" style="background:#fff3cd;color:#856404;"><i class="fas fa-clock"></i> Pendiente</span>`}
        </div>
        ${e.texto ? `<p style="font-size:.85rem;color:var(--texto2);margin:.4rem 0;">${e.texto}</p>` : ""}
        ${e.url_archivo ? `<a href="${e.url_archivo}" target="_blank" class="btn-archivo-link"><i class="fas fa-file"></i> Ver archivo</a>` : ""}
        ${yaCalificado ? `
          <div style="margin-top:.8rem;padding:.8rem;background:#e0f7e9;border-radius:10px;border:1.5px solid #a8ddb8;">
            <p style="font-size:.85rem;color:#1b7a3e;font-weight:700;"><i class="fas fa-star"></i> Calificación: ${e.calificacion} pts</p>
            ${e.comentario ? `<p style="font-size:.82rem;color:#1b7a3e;margin-top:.3rem;"><i class="fas fa-comment"></i> ${e.comentario}</p>` : ""}
            <button class="btn-primario btn-sm" style="margin-top:.8rem;" onclick="recalificarEntregaTarea('${e.id}')">
              <i class="fas fa-pen"></i> Editar calificación
            </button>
          </div>` : `
          <div class="calificar-row" style="display:flex;gap:.6rem;align-items:center;margin-top:.8rem;flex-wrap:wrap;">
            <input type="number" placeholder="Puntos" min="0" max="100"
              id="calt-${e.id}" style="width:80px;padding:.3rem .5rem;border:1.5px solid var(--gris-borde);border-radius:8px;">
            <input type="text" placeholder="Comentario"
              id="comt-${e.id}" style="flex:1;padding:.3rem .6rem;border:1.5px solid var(--gris-borde);border-radius:8px;">
            <button class="btn-primario btn-sm" onclick="calificarEntregaTarea('${e.id}','${tareaId}','${titulo}')">
              <i class="fas fa-check"></i> Calificar
            </button>
          </div>`}
      </div>`;
  }).join("");
};

window.calificarEntregaTarea = async function(entregaId, tareaId, titulo) {
  const cal = document.getElementById(`calt-${entregaId}`)?.value;
  const com = document.getElementById(`comt-${entregaId}`)?.value;
  if (!cal) { alert("Ingresa una calificación."); return; }
  const { error } = await supabaseClient.from("entregas_tareas").update({
    calificacion: parseInt(cal),
    comentario: com || null
  }).eq("id", entregaId);
  if (error) { alert("Error al calificar."); return; }
  alert("¡Calificación guardada!");
  await verEntregasTarea(tareaId, titulo);
};

window.recalificarEntregaTarea = function(entregaId) {
  const btn = document.querySelector(`button[onclick="recalificarEntregaTarea('${entregaId}')"]`);
  const div = document.createElement("div");
  div.style.cssText = "margin-top:.8rem;display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;";
  div.innerHTML = `
    <input type="number" placeholder="Puntos" min="0" max="100"
      id="calt-${entregaId}" style="width:80px;padding:.3rem .5rem;border:1.5px solid var(--gris-borde);border-radius:8px;">
    <input type="text" placeholder="Comentario"
      id="comt-${entregaId}" style="flex:1;padding:.3rem .6rem;border:1.5px solid var(--gris-borde);border-radius:8px;">
    <button class="btn-primario btn-sm" onclick="calificarEntregaTarea('${entregaId}','','')">
      <i class="fas fa-check"></i> Guardar
    </button>`;
  btn?.closest("div")?.replaceWith(div);
};
// ══ ACCIONES DETALLE CURSO ════════════════════════════════════════════════════
function initAccionesCurso(cursoId) {

  // Crear módulo
  clonar("btnCrearModulo");
  document.getElementById("btnCrearModulo")?.addEventListener("click", async () => {
    const titulo = document.getElementById("moduloTitulo")?.value.trim();
    const alerta = document.getElementById("alertaModulo");
    if (!titulo) { mostrarAlerta(alerta, "error", "Escribe el título del módulo."); return; }
    const { error } = await supabaseClient.from("modulos").insert({
      curso_id: cursoId, titulo, orden: 0
    });
    if (error) { mostrarAlerta(alerta, "error", "Error al crear."); return; }
    mostrarAlerta(alerta, "ok", "Módulo creado.");
    document.getElementById("moduloTitulo").value = "";
    await cargarModulos(cursoId);
  });

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

  // Subir archivo general con Storage
  clonar("btnSubirArchivo");
  document.getElementById("btnSubirArchivo")?.addEventListener("click", async () => {
    const nombre  = document.getElementById("archivoNombre")?.value.trim();
    const fileEl  = document.getElementById("archivoFileCurso");
    const urlManual = document.getElementById("archivoUrl")?.value.trim();
    const alerta  = document.getElementById("alertaArchivo");
    const { data: { user } } = await supabaseClient.auth.getUser();

    let urlFinal = urlManual;

    if (fileEl?.files?.[0]) {
      const file     = fileEl.files[0];
      const ext      = file.name.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabaseClient.storage
        .from("cursos").upload(fileName, file, { upsert: false });
      if (uploadError) { mostrarAlerta(alerta, "error", "Error al subir archivo."); return; }
      const { data: { publicUrl } } = supabaseClient.storage.from("cursos").getPublicUrl(fileName);
      urlFinal = publicUrl;
    }

    if (!urlFinal) { mostrarAlerta(alerta, "error", "Sube un archivo o ingresa un enlace."); return; }

    const { error } = await supabaseClient.from("archivos")
      .insert({ curso_id: cursoId, docente_id: user.id, nombre_archivo: nombre || "Archivo", url: urlFinal });
    if (error) { mostrarAlerta(alerta, "error", "Error al guardar."); return; }
    mostrarAlerta(alerta, "ok", "Archivo agregado.");
    document.getElementById("archivoNombre").value = "";
    document.getElementById("archivoUrl").value    = "";
    if (fileEl) fileEl.value = "";
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
      descripcion: desc || null, fecha_entrega: fecha || null,
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

// ══ PESTAÑAS ══════════════════════════════════════════════════════════════════
function initTabs() {
  document.addEventListener("click", e => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("activa"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("oculto"));
    btn.classList.add("activa");
    document.getElementById(`tab-${btn.dataset.tab}`)?.classList.remove("oculto");
  });

  // Tabs contenido módulo
  document.addEventListener("click", e => {
    const btn = e.target.closest(".tab-contenido-btn");
    if (!btn) return;
    document.querySelectorAll(".tab-contenido-btn").forEach(b => b.classList.remove("activa"));
    document.querySelectorAll(".tab-contenido-panel").forEach(p => p.classList.add("oculto"));
    btn.classList.add("activa");
    document.getElementById(`panel-${btn.dataset.panel}`)?.classList.remove("oculto");
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
    .from("inscripciones").select("estudiante_id, curso_id").in("curso_id", cursoIds);

  if (!data || data.length === 0) {
    tabla.innerHTML = `<p class="sin-datos">Sin estudiantes inscritos.</p>`;
    return;
  }

  const ids = [...new Set(data.map(i => i.estudiante_id))];
  const { data: perfiles } = await supabaseClient
    .from("perfiles").select("user_id, nombre, apellido").in("user_id", ids);

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
    renderTabla(items.filter(i => `${i.nombre} ${i.apellido}`.toLowerCase().includes(q)));
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


      if (btn.dataset.vista === "preview") {
        cargarPreviewEstudiante();
      }
    });
  });
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
  if (diff < 0) return "vencida";
  if (diff < 2) return "urgente";
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
// ══ VISTA PREVIA ESTUDIANTE ═══════════════════════════════════════════════════
async function cargarPreviewEstudiante() {
  const el = document.getElementById("previewCursos");
  if (!el) return;

  if (!cursosDocente || cursosDocente.length === 0) {
    el.innerHTML = `<p class="sin-datos"><i class="fas fa-folder-open"></i><br>Aún no tienes cursos creados.</p>`;
    return;
  }

  el.innerHTML = `

    <div class="preview-grid">
      ${cursosDocente.map(c => `
        <div class="tarjeta-curso preview-tarjeta" data-cursoid="${c.id}">
          <div class="tarjeta-curso-top">
            ${c.nivel ? `<span class="etiqueta-nivel ${c.nivel}">${c.nivel}</span>` : ""}
            <h3>${c.nombre}</h3>
            <p>${c.descripcion || ""}</p>
          </div>
          <div class="tarjeta-curso-footer">
            <i class="fas fa-book-open"></i> Ver curso
          </div>
        </div>
      `).join("")}
    </div>`;

  // Eventos
  document.querySelectorAll(".preview-tarjeta").forEach(card => {
    card.addEventListener("click", () => abrirPreviewCurso(card.dataset.cursoid));
  });
}

async function abrirPreviewCurso(cursoId) {
  const curso = cursosDocente.find(c => c.id === cursoId);
  if (!curso) return;

  const el = document.getElementById("previewCursos");
  el.innerHTML = `<div class="sin-datos"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>`;

  // Cargar módulos igual que el estudiante
  const { data: modulos } = await supabaseClient
    .from("modulos").select("*").eq("curso_id", cursoId)
    .order("orden", { ascending: true });

  let modulosHTML = "";

  if (!modulos || modulos.length === 0) {
    modulosHTML = `<p class="sin-datos">Este curso no tiene módulos aún.</p>`;
  } else {
    for (const m of modulos) {
      const { data: contenidos } = await supabaseClient
        .from("contenidos").select("*").eq("modulo_id", m.id)
        .order("orden", { ascending: true });

      const contenidosHTML = (contenidos && contenidos.length > 0)
        ? contenidos.map(c => {
            let preview = "";
            if (c.tipo === "texto") {
              preview = `<div class="contenido-texto-preview">${c.cuerpo || ""}</div>`;
            } else if (c.tipo === "video") {
              const vid = extraerYoutubeId(c.url || "");
              preview = vid
                ? `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${vid}" frameborder="0" allowfullscreen></iframe></div>`
                : `<a href="${c.url}" target="_blank">${c.url}</a>`;
            } else if (c.tipo === "archivo") {
              preview = `<a href="${c.url}" target="_blank" class="btn-archivo-link"><i class="fas fa-file-download"></i> ${c.titulo || "Descargar archivo"}</a>`;
            } else if (c.tipo === "enlace") {
              preview = `<a href="${c.url}" target="_blank" class="btn-archivo-link"><i class="fas fa-link"></i> ${c.titulo || c.url}</a>`;
            }
            return `
              <div class="contenido-item">
                <span class="tipo-tag tipo-${c.tipo}">
                  <i class="fas fa-${iconoTipo(c.tipo)}"></i> ${c.tipo}
                </span>
                ${c.titulo ? `<strong style="display:block;margin-top:.5rem;">${c.titulo}</strong>` : ""}
                ${preview}
              </div>`;
          }).join("")
        : `<p class="sin-datos" style="font-size:.82rem;padding:1rem;">Sin contenido en este módulo.</p>`;

      // Actividades del módulo
      const { data: actividades } = await supabaseClient
        .from("actividades").select("*").eq("modulo_id", m.id)
        .order("creado_at", { ascending: true });

      const actividadesHTML = (actividades && actividades.length > 0)
        ? actividades.map(a => `
            <div class="item-tarea">
              <div class="meta-fila">
                ${a.fecha_entrega ? `<span class="vence-tag ${urgencia(a.fecha_entrega)}">Vence: ${formatFecha(a.fecha_entrega)}</span>` : ""}
              </div>
              <strong>${a.titulo}</strong>
              <p>${a.descripcion || ""}</p>
              ${a.puntos ? `<span style="font-size:.8rem;color:var(--azul2);font-weight:700;">${a.puntos} pts</span>` : ""}
              <p class="campo-nota" style="margin-top:.5rem;">
                <i class="fas fa-lock"></i> Vista previa — los estudiantes pueden entregar aquí.
              </p>
            </div>`).join("")
        : "";

      modulosHTML += `
        <div class="preview-modulo">
          <div class="preview-modulo-header">
            <i class="fas fa-book-open"></i>
            <span>${m.titulo}</span>
          </div>
          <div class="preview-modulo-contenidos">
            <p style="font-size:.78rem;font-weight:700;color:var(--texto2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.6rem;">
              Contenido
            </p>
            ${contenidosHTML}
            ${actividadesHTML ? `
              <p style="font-size:.78rem;font-weight:700;color:var(--texto2);text-transform:uppercase;letter-spacing:.05em;margin:1rem 0 .6rem;">
                Actividades
              </p>
              ${actividadesHTML}` : ""}
          </div>
        </div>`;
    }
  }

  el.innerHTML = `
    <button class="btn-volver" id="btnVolverPreview">
      <i class="fas fa-arrow-left"></i> Volver a mis cursos
    </button>
    <div class="preview-detalle-header">
      ${curso.nivel ? `<span class="etiqueta-nivel ${curso.nivel}">${curso.nivel}</span>` : ""}
      <h2>${curso.nombre}</h2>
      <p>${curso.descripcion || ""}</p>
    </div>
    <div class="preview-modulos-lista" style="margin-top:1.2rem;">
      ${modulosHTML}
    </div>`;

  document.getElementById("btnVolverPreview")?.addEventListener("click", cargarPreviewEstudiante);
}

window.toggleVisibilidad = async function(e, cursoId, publicadoActual) {
  e.stopPropagation(); // evita que abra el detalle del curso

  const nuevo = !publicadoActual;
  const { error } = await supabaseClient
    .from("cursos")
    .update({ publicado: nuevo })
    .eq("id", cursoId);

  if (error) { alert("Error al cambiar visibilidad."); return; }

  // Actualiza en el array local
  const curso = cursosDocente.find(c => c.id === cursoId);
  if (curso) curso.publicado = nuevo;

  renderCursos(); // re-renderiza las tarjetas
};

// ══ EDITAR INFO CURSO ══════════════════════════════════════════════════════════
document.addEventListener("click", function(e) {
  if (!e.target.closest("#btnEditarCurso")) return;

  document.getElementById("modalEditCurso")?.remove();

  const modal = document.createElement("div");
  modal.id        = "modalEditCurso";
  modal.className = "modal-overlay activo";
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-box-header">
        <h3><i class="fas fa-pen" style="color:var(--rosa2)"></i> Editar curso</h3>
        <button class="btn-icono" onclick="this.closest('.modal-overlay').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-edit-body">
        <div class="campo-grupo">
          <label>Nombre del curso</label>
          <input type="text" id="editCursoNombre" value="${cursoActivo.nombre}">
        </div>
        <div class="campo-grupo">
          <label>Descripción</label>
          <textarea id="editCursoDesc" rows="3">${cursoActivo.descripcion || ""}</textarea>
        </div>
        <div class="campo-grupo">
          <label>Categoría</label>
          <select id="editCursoNivel">
            <option value="basico"     ${cursoActivo.nivel === "basico"     ? "selected" : ""}>Básico</option>
            <option value="intermedio" ${cursoActivo.nivel === "intermedio" ? "selected" : ""}>Intermedio</option>
            <option value="avanzado"   ${cursoActivo.nivel === "avanzado"   ? "selected" : ""}>Avanzado</option>
          </select>
        </div>
        <div id="alertaEditCurso" class="alerta"></div>
        <button class="btn-primario" id="btnGuardarEditCurso">
          <i class="fas fa-floppy-disk"></i> Guardar cambios
        </button>
      </div>
    </div>`;

  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);

  document.getElementById("btnGuardarEditCurso").addEventListener("click", async () => {
    const nombre = document.getElementById("editCursoNombre")?.value.trim();
    const desc   = document.getElementById("editCursoDesc")?.value.trim();
    const nivel  = document.getElementById("editCursoNivel")?.value;
    const alerta = document.getElementById("alertaEditCurso");

    if (!nombre) { mostrarAlerta(alerta, "error", "El nombre es obligatorio."); return; }

    const { error } = await supabaseClient.from("cursos")
      .update({ nombre, descripcion: desc || null, nivel })
      .eq("id", cursoActivo.id);

    if (error) { mostrarAlerta(alerta, "error", "Error al guardar."); return; }

    // Actualizar en local
    cursoActivo.nombre      = nombre;
    cursoActivo.descripcion = desc;
    cursoActivo.nivel       = nivel;

    const idx = cursosDocente.findIndex(c => c.id === cursoActivo.id);
    if (idx !== -1) cursosDocente[idx] = { ...cursosDocente[idx], nombre, descripcion: desc, nivel };

    // Actualizar vista sin recargar
    document.getElementById("detNombre").textContent = nombre;
    document.getElementById("detDesc").textContent   = desc || "";
    const nivelEl = document.getElementById("detNivel");
    if (nivelEl) { nivelEl.textContent = nivel; nivelEl.className = `etiqueta-nivel ${nivel}`; }

    mostrarAlerta(alerta, "ok", "¡Curso actualizado!");
    setTimeout(() => modal.remove(), 900);
  });
});
