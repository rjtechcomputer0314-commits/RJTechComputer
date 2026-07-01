/* ════════════════════════════════════════════════════════════════
   RJTechEdu — correo-config.js
   Configuración para que el ADMINISTRADOR reciba un correo real
   cada vez que alguien se registra como DOCENTE.

   Usa EmailJS (https://www.emailjs.com) — es gratis hasta 200
   correos al mes y funciona directo desde el navegador, sin
   necesitar un servidor.

   ── CÓMO CONFIGURARLO (5-10 minutos) ──
   1. Entra a https://www.emailjs.com/ y crea una cuenta gratis.
   2. Ve a "Email Services" → "Add New Service" → elige Gmail →
      conecta la cuenta rjtechcomputer0314@gmail.com.
      Copia el "Service ID" que te genera y pégalo abajo en
      EMAILJS_SERVICE_ID.
   3. Ve a "Email Templates" → "Create New Template". Arma el correo
      como quieras, usando estas variables (van entre llaves dobles):
        {{nombre}}   {{apellido}}   {{correo}}   {{telefono}}
      Ejemplo de cuerpo del correo:
        "Un nuevo docente se registró en RJTechEdu:
         Nombre: {{nombre}} {{apellido}}
         Correo: {{correo}}
         Teléfono: {{telefono}}
         Ingresa al panel de administrador para aprobarlo."
      En el campo "To Email" de la plantilla pon: {{to_email}}
      Copia el "Template ID" y pégalo abajo en EMAILJS_TEMPLATE_ID.
   4. Ve a "Account" → "General" y copia tu "Public Key".
      Pégala abajo en EMAILJS_PUBLIC_KEY.
   5. Guarda este archivo y sube los cambios. ¡Listo! Cuando un
      docente termine su registro, te llegará el correo automático.

   Mientras dejes los valores como "TU_..._AQUI", el sitio funciona
   normal, simplemente no se envía el correo (no rompe nada).
   ════════════════════════════════════════════════════════════════ */

const EMAILJS_PUBLIC_KEY  = "a8S9mPMaYg6slej3G";
const EMAILJS_SERVICE_ID  = "service_y6zizmv";
const EMAILJS_TEMPLATE_ID = "template_jhc4jgh";

// Correo del administrador que debe recibir el aviso:
const CORREO_ADMIN_AVISOS = "rjtechcomputer0314@gmail.com";

if (window.emailjs && !EMAILJS_PUBLIC_KEY.startsWith("TU_")) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}
