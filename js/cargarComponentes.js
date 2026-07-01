/* ══ CARGA DE COMPONENTES HTML ════════════════════
   Cada fetch tiene manejo de error para evitar fallos silenciosos.
════════════════════════════════════════════════ */

function cargarHTML(url, idContenedor, callback) {
    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
            return res.text();
        })
        .then(html => {
            const el = document.getElementById(idContenedor);
            if (!el) return;
            el.innerHTML = html;
            if (typeof callback === "function") callback();
        })
        .catch(err => console.warn("[cargarComponentes]", err.message));
}

/* ══ HEADER ══════════════════════════════════════ */
cargarHTML("/componentes/header.html", "header", () => {
    /* Submenu en escritorio */
    document.querySelectorAll(".submenu > a").forEach(link => {
        link.addEventListener("click", function(e) {
            if (window.innerWidth <= 900) {
                e.preventDefault();
                this.closest(".submenu").classList.toggle("active");
            }
        });
    });

    actualizarHeader();
});

/* ══ FOOTER ══════════════════════════════════════ */
cargarHTML("/componentes/footer.html", "footer");

/* ══ REGISTRO ════════════════════════════════════ */
cargarHTML("/componentes/registro.html", "registro-container");

/* ══ LOGIN ═══════════════════════════════════════ */
cargarHTML("/componentes/login.html", "login-container");

/* ══ FLOTANTES ═══════════════════════════════════ */
cargarHTML("/componentes/flotantes.html", "flotantes-container");
