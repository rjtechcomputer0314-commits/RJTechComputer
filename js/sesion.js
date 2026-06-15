async function actualizarHeader() {
    const contenedor = document.getElementById("botonesHeader");
    if (!contenedor) return;

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        // Sin sesión — botones normales
        contenedor.innerHTML = `
            <button class="boton1" id="abrirModal">Registrarme</button>
            <button class="boton2" id="abrirLogin">Iniciar sesión</button>
        `;
        return;
    }

    // Obtener perfil
    const { data: perfil } = await supabaseClient
        .from("perfiles")
        .select("nombre, rol")
        .eq("user_id", session.user.id)
        .single();

    if (!perfil) return;

    const panel = perfil.rol === "docente"
        ? "/paginas/panel_docente.html"
        : "/paginas/panel_estudiante.html";

    contenedor.innerHTML = `
        <div class="usuario-header">
            <span class="usuario-nombre">
                <i class="fas fa-circle-user"></i> ${perfil.nombre}
            </span>
            <a href="${panel}" class="boton1">Mi panel</a>
            <button class="boton2" id="btnCerrarSesionHeader">Cerrar sesión</button>
        </div>
    `;

    document.getElementById("btnCerrarSesionHeader")
        ?.addEventListener("click", async () => {
            await supabaseClient.auth.signOut();
            window.location.href = "/index.html";
        });
}