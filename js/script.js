const preguntas = document.querySelectorAll(".pregunta-item");

preguntas.forEach((item) => {
    const titulo = item.querySelector(".pregunta-titulo");

    titulo.addEventListener("click", () => {

        // Cierra las demás preguntas
        preguntas.forEach((p) => {
            if (p !== item) {
                p.classList.remove("active");
                p.querySelector(".pregunta-titulo")
                    .setAttribute("aria-expanded", "false");
            }
        });

        // Abre o cierra la pregunta seleccionada
        item.classList.toggle("active");

        titulo.setAttribute(
            "aria-expanded",
            item.classList.contains("active")
        );
    });
});