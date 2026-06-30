/* ══ MODALES ══════════════════════════════════════
   Abrir / cerrar con delegación de eventos.
   • Cierra al hacer clic en el backdrop (fuera del .modal-contenido)
   • Cierra al presionar la tecla Escape
════════════════════════════════════════════════ */

function abrirModal(id) {
    const m = document.getElementById(id);
    if (m) {
        m.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

function cerrarModal(id) {
    const m = document.getElementById(id);
    if (m) {
        m.classList.remove("active");
        document.body.style.overflow = "";
    }
}

document.addEventListener("click", (e) => {

    /* ABRIR REGISTRO — por id o por clase */
    if (e.target.id === "abrirModal" || e.target.classList.contains("btn-modal-registro")) {
        abrirModal("modalRegistro");
        return;
    }

    /* ABRIR LOGIN */
    if (e.target.id === "abrirLogin") {
        abrirModal("modalLogin");
        return;
    }

    /* CERRAR REGISTRO — botón X */
    if (e.target.id === "cerrarRegistro") {
        cerrarModal("modalRegistro");
        return;
    }

    /* CERRAR LOGIN — botón X */
    if (e.target.id === "cerrarLogin") {
        cerrarModal("modalLogin");
        return;
    }

    /* CERRAR haciendo clic en el fondo (backdrop) */
    if (e.target.classList.contains("modal") && e.target.classList.contains("active")) {
        e.target.classList.remove("active");
        document.body.style.overflow = "";
        return;
    }

    /* NAVEGAR: Registro → Login */
    if (e.target.id === "irLogin") {
        e.preventDefault();
        cerrarModal("modalRegistro");
        abrirModal("modalLogin");
        return;
    }

    /* NAVEGAR: Login → Registro */
    if (e.target.id === "irRegistro") {
        e.preventDefault();
        cerrarModal("modalLogin");
        abrirModal("modalRegistro");
        return;
    }

    /* MOSTRAR / OCULTAR CONTRASEÑA */
    if (e.target.classList.contains("toggle-password")) {
        const input = document.getElementById(e.target.dataset.target);
        if (!input) return;
        if (input.type === "password") {
            input.type = "text";
            e.target.classList.replace("fa-eye", "fa-eye-slash");
        } else {
            input.type = "password";
            e.target.classList.replace("fa-eye-slash", "fa-eye");
        }
    }
});

/* Cerrar con tecla Escape */
document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".modal.active").forEach((m) => {
        m.classList.remove("active");
        document.body.style.overflow = "";
    });
});
