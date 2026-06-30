/**
 * registro-pasos.js
 * Maneja la lógica del modal de registro en 2 pasos:
 *   Paso 1 → elegir rol (Estudiante / Docente)
 *   Paso 2 → formulario
 *
 * Se carga como archivo .js normal para que el navegador
 * lo ejecute (los <script> dentro de innerHTML son ignorados).
 */

document.addEventListener("click", function (e) {

    /* ── Seleccionar tarjeta de rol ─────────────────── */
    const card = e.target.closest(".rol-card");
    if (card && card.closest("#pasoRol")) {
        document.querySelectorAll(".rol-card").forEach(c => {
            c.classList.remove("seleccionado");
            c.setAttribute("aria-pressed", "false");
        });
        card.classList.add("seleccionado");
        card.setAttribute("aria-pressed", "true");

        const btn = document.getElementById("btnContinuarRol");
        if (btn) btn.disabled = false;
        return;
    }

    /* ── Continuar al formulario ────────────────────── */
    if (e.target.closest("#btnContinuarRol")) {
        const seleccionada = document.querySelector(".rol-card.seleccionado");
        if (!seleccionada) return;

        const rol    = seleccionada.dataset.rol;
        const select = document.getElementById("rolRegistro");
        if (select) select.value = rol;

        /* Actualizar visual del paso 2 */
        const icono     = document.getElementById("iconoRolSeleccionado");
        const subtitulo = document.getElementById("subtituloRolSeleccionado");
        if (icono) icono.className = rol === "docente"
            ? "fas fa-chalkboard-teacher"
            : "fas fa-user-graduate";
        if (subtitulo) subtitulo.textContent =
            rol === "docente" ? "Cuenta Docente" : "Cuenta Estudiante";

        document.getElementById("pasoRol").style.display  = "none";
        document.getElementById("pasoForm").style.display = "block";
        document.getElementById("nombreRegistro")?.focus();
        return;
    }

    /* ── Volver a selección de rol ──────────────────── */
    if (e.target.closest("#btnCambiarRol")) {
        document.getElementById("pasoForm").style.display = "none";
        document.getElementById("pasoRol").style.display  = "block";
        return;
    }

    /* ── Ir a login desde el formulario ─────────────── */
    if (e.target.id === "irLoginDesdeForm") {
        e.preventDefault();
        document.getElementById("modalRegistro")?.classList.remove("active");
        document.getElementById("modalLogin")?.classList.add("active");
        document.body.style.overflow = "";
        return;
    }

    /* ── Resetear el modal al cerrar ────────────────── */
    const esCerrar =
        e.target.id === "cerrarRegistro" ||
        (e.target.classList.contains("modal") && e.target.id === "modalRegistro");

    if (esCerrar) {
        setTimeout(resetearModalRegistro, 350);
    }
});

/* También resetear al presionar Escape */
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        const abierto = document.querySelector("#modalRegistro.active");
        if (abierto) setTimeout(resetearModalRegistro, 350);
    }
});

function resetearModalRegistro() {
    const pasoRol  = document.getElementById("pasoRol");
    const pasoForm = document.getElementById("pasoForm");
    if (!pasoRol || !pasoForm) return;

    pasoRol.style.display  = "block";
    pasoForm.style.display = "none";

    document.querySelectorAll(".rol-card").forEach(c => {
        c.classList.remove("seleccionado");
        c.setAttribute("aria-pressed", "false");
    });

    const btnContinuar = document.getElementById("btnContinuarRol");
    if (btnContinuar) btnContinuar.disabled = true;

    const otp = document.getElementById("seccionOTP");
    if (otp) otp.style.display = "none";

    const form = document.getElementById("formRegistro");
    if (form) form.reset();

    const submitBtn = form?.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus" style="margin-right:8px" aria-hidden="true"></i>REGISTRARME';
    }
}
