/* APLICAR TEMA INMEDIATAMENTE (antes de que cargue todo) */
if (localStorage.getItem("modo") === "oscuro") {
    document.body.classList.add("dark-mode");
}

/* TEMA OSCURO Y CLARO */
document.addEventListener("click", (e) => {
    const boton = e.target.closest("#themeToggle");
    if (boton) {
        document.body.classList.toggle("dark-mode");
        const icono = boton.querySelector("i");

        if (document.body.classList.contains("dark-mode")) {
            icono.classList.replace("fa-moon", "fa-sun");
            localStorage.setItem("modo", "oscuro");
        } else {
            icono.classList.replace("fa-sun", "fa-moon");
            localStorage.setItem("modo", "claro");
        }
    }
});

/* RECUPERAR ÍCONO DEL BOTÓN cuando se cargue */
function aplicarIconoTema() {
    const boton = document.getElementById("themeToggle");
    if (!boton) {
        setTimeout(aplicarIconoTema, 300);
        return;
    }
    if (localStorage.getItem("modo") === "oscuro") {
        boton.querySelector("i")?.classList.replace("fa-moon", "fa-sun");
    }
}
aplicarIconoTema();
