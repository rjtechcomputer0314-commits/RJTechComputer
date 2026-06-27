document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { cargarMisCursosPagina(); }, 900);
});

async function cargarMisCursosPagina() {
    const seccion   = document.getElementById("seccionMisCursos");
    const grid      = document.getElementById("misCursosGrid");
    const titulo    = document.getElementById("misCursosTitulo");
    const subtitulo = document.getElementById("misCursosSubtitulo");
    if (!seccion || !grid) return;

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        seccion.classList.add("oculto");
        return;
    }

    seccion.classList.remove("oculto");

    const { data: perfil } = await supabaseClient
        .from("perfiles")
        .select("nombre, rol")
        .eq("user_id", session.user.id)
        .single();

    if (!perfil) { seccion.classList.add("oculto"); return; }

    const esDocente = perfil.rol === "docente";
    const panel = esDocente ? "/paginas/panel_docente.html" : "/paginas/panel_estudiante.html";

    if (titulo) {
        titulo.innerHTML = esDocente
            ? `<i class="fas fa-chalkboard-teacher"></i> Mis cursos creados`
            : `<i class="fas fa-user-graduate"></i> Mis cursos inscritos`;
    }
    if (subtitulo) {
        subtitulo.textContent = esDocente
            ? "Los cursos que has creado como docente."
            : "Los cursos en los que estás inscrito como estudiante.";
    }

    let cursos = [];

    if (esDocente) {
        const { data } = await supabaseClient
            .from("cursos")
            .select("id, nombre, descripcion, nivel, codigo")
            .eq("docente_id", session.user.id)
            .order("creado_at", { ascending: false });
        cursos = data || [];
    } else {
        const { data } = await supabaseClient
            .from("inscripciones")
            .select("cursos(id, nombre, descripcion, nivel, codigo, docente_id)")
            .eq("estudiante_id", session.user.id);
        cursos = (data || []).map(i => i.cursos).filter(Boolean);

        // Obtener nombre del docente de cada curso
        const docenteIds = [...new Set(cursos.map(c => c.docente_id))];
        if (docenteIds.length > 0) {
            const { data: docentes } = await supabaseClient
                .from("perfiles")
                .select("user_id, nombre, apellido")
                .in("user_id", docenteIds);
            const map = {};
            (docentes || []).forEach(d => map[d.user_id] = d);
            cursos = cursos.map(c => ({
                ...c,
                docenteNombre: map[c.docente_id] ? `${map[c.docente_id].nombre} ${map[c.docente_id].apellido}` : ""
            }));
        }
    }

    if (cursos.length === 0) {
        grid.innerHTML = `
            <div class="mis-cursos-vacio">
                <i class="fas ${esDocente ? 'fa-folder-open' : 'fa-book-open'}"></i>
                <p>${esDocente ? "Aún no has creado ningún curso." : "Aún no estás inscrito en ningún curso."}</p>
                <a href="${panel}" class="btn-curso">
                    ${esDocente ? "Crear mi primer curso" : "Unirme a un curso"}
                </a>
            </div>`;
        return;
    }

    grid.innerHTML = cursos.map(c => `
        <a href="${panel}" class="mini-curso-card">
            <div class="mini-curso-top">
                ${c.nivel ? `<span class="mini-curso-nivel ${c.nivel}">${c.nivel}</span>` : ""}
                <h3>${c.nombre}</h3>
                <p>${c.descripcion || ""}</p>
            </div>
            <div class="mini-curso-footer">
                ${esDocente
                    ? `<i class="fas fa-key"></i> ${c.codigo}`
                    : `<i class="fas fa-chalkboard-teacher"></i> ${c.docenteNombre || ""}`
                }
            </div>
        </a>
    `).join("");
}
