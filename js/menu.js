/*  para el menú lateral que aparece en pantalla de celular*/
document.addEventListener("DOMContentLoaded", () => {

    const esperarHeader = setInterval(() => {

        const menuToggle  = document.getElementById("menu-toggle");
        const navMenu     = document.getElementById("nav-menu");
        const navCerrar   = document.getElementById("nav-cerrar");
        const navOverlay  = document.getElementById("nav-overlay");

        if (menuToggle && navMenu && navOverlay) {

            clearInterval(esperarHeader);

            const abrirMenu = () => {
                navMenu.classList.add("active");
                navOverlay.classList.add("active");
                document.body.style.overflow = "hidden";
            };

            const cerrarMenu = () => {
                navMenu.classList.remove("active");
                navOverlay.classList.remove("active");
                document.body.style.overflow = "";
            };

            menuToggle.addEventListener("click", abrirMenu);
            navCerrar?.addEventListener("click", cerrarMenu);
            navOverlay.addEventListener("click", cerrarMenu);

            // Cerrar al hacer click en un link normal
            navMenu.querySelectorAll("ul > li > a").forEach(link => {
                link.addEventListener("click", () => {
                    const esSubmenu = link.parentElement.classList.contains("submenu");
                    if (!esSubmenu || window.innerWidth > 900) {
                        cerrarMenu();
                    }
                });
            });

            // Submenu en móvil
            document.querySelectorAll(".submenu > a").forEach(link => {
                link.addEventListener("click", function(e) {
                    if (window.innerWidth <= 900) {
                        e.preventDefault();
                        this.closest(".submenu").classList.toggle("active");
                    }
                });
            });

            // Cerrar al redimensionar
            window.addEventListener("resize", () => {
                if (window.innerWidth > 900) {
                    cerrarMenu();
                    document.querySelectorAll(".submenu").forEach(s => s.classList.remove("active"));
                }
            });

        } // cierre if

    }, 100); // cierre setInterval

}); // cierre DOMContentLoaded


/*  BOTÓN FLOTANTE (WhatsApp y teléfono) */
document.addEventListener("click", (e) => {
    const mainBtn = e.target.closest("#mainFloatBtn");
    if (mainBtn) {
        document.getElementById("floatItems")?.classList.toggle("active");
    }
});


/*  ACORDEÓN PREGUNTAS */
document.querySelectorAll(".pregunta-item").forEach((item) => {
    item.querySelector(".pregunta-titulo")?.addEventListener("click", () => {
        item.classList.toggle("active");
    });
});