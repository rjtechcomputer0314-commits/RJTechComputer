/**
 * Sistema de notificaciones toast
 * Reemplaza los alert() nativos del navegador
 */

(function () {
  /* Crear contenedor si no existe */
  function getContenedor() {
    let c = document.getElementById("toast-contenedor");
    if (!c) {
      c = document.createElement("div");
      c.id = "toast-contenedor";
      document.body.appendChild(c);
    }
    return c;
  }

  /**
   * Muestra un toast
   * @param {string} mensaje  - Texto a mostrar
   * @param {"exito"|"error"|"info"|"advertencia"} tipo - Tipo visual
   * @param {number} duracion - Milisegundos hasta desvanecerse (0 = manual)
   */
  window.showToast = function (mensaje, tipo = "info", duracion = 4000) {
    const iconos = {
      exito:      "fas fa-check-circle",
      error:      "fas fa-times-circle",
      info:       "fas fa-info-circle",
      advertencia:"fas fa-exclamation-triangle",
    };

    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");

    toast.innerHTML = `
      <i class="${iconos[tipo] || iconos.info}" aria-hidden="true"></i>
      <span>${mensaje}</span>
      <button class="toast-cerrar" aria-label="Cerrar notificación">&times;</button>
    `;

    const cerrar = () => {
      toast.classList.add("toast-salir");
      toast.addEventListener("animationend", () => toast.remove(), { once: true });
    };

    toast.querySelector(".toast-cerrar").addEventListener("click", cerrar);

    getContenedor().appendChild(toast);

    /* Forzar reflow para activar animación de entrada */
    void toast.offsetWidth;
    toast.classList.add("toast-entrar");

    if (duracion > 0) setTimeout(cerrar, duracion);
  };
})();
