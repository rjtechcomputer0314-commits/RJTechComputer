document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { iniciarAuth(); }, 800);
});

function iniciarAuth() {

    // ── REGISTRO ──
    const formRegistro = document.getElementById("formRegistro");

    if (formRegistro) {
        formRegistro.addEventListener("submit", async (e) => {
            e.preventDefault();

            const nombre    = document.getElementById("nombreRegistro").value;
            const apellido  = document.getElementById("apellidoRegistro").value;
            const telefono  = document.getElementById("telefonoRegistro").value;
            const rol       = document.getElementById("rolRegistro").value;
            const correo    = document.getElementById("correoRegistro").value;
            const password  = document.getElementById("passwordRegistro").value;
            const confirmar = document.getElementById("confirmPassword").value;

            if (!rol)               { alert("Selecciona un tipo de cuenta.");   return; }
            if (password !== confirmar) { alert("Las contraseñas no coinciden."); return; }

            const { data, error } = await supabaseClient.auth.signUp({
                email: correo,
                password: password
            });

            if (error)       { alert(error.message);                    return; }
            if (!data.user)  { alert("No se pudo obtener el usuario."); return; }

            sessionStorage.setItem("correoRegistro", correo);
            sessionStorage.setItem("perfilTemp", JSON.stringify({
                user_id: data.user.id,
                nombre, apellido, telefono, correo, rol
            }));

            // Mostrar sección OTP
            const seccionOTP = document.getElementById("seccionOTP");
            if (seccionOTP) {
                seccionOTP.style.display = "block";
                seccionOTP.scrollIntoView({ behavior: "smooth" });
                // Enfocar la primera cajita
                const primerInput = seccionOTP.querySelector(".otp-input");
                if (primerInput) primerInput.focus();
            }

            // Desactivar el formulario para que no se reenvíe
            formRegistro.querySelector("button[type='submit']").disabled = true;
        });
    }

    // ── NAVEGACIÓN ENTRE CAJITAS OTP ──
    document.addEventListener("input", (e) => {
        if (!e.target.classList.contains("otp-input")) return;
        const input = e.target;
        input.value = input.value.replace(/\D/g, "");
        const inputs = [...document.querySelectorAll(".otp-input")];
        const i = inputs.indexOf(input);
        if (input.value && i < inputs.length - 1) inputs[i + 1].focus();
    });

    document.addEventListener("keydown", (e) => {
        if (!e.target.classList.contains("otp-input")) return;
        const inputs = [...document.querySelectorAll(".otp-input")];
        const i = inputs.indexOf(e.target);
        if (e.key === "Backspace" && !e.target.value && i > 0) inputs[i - 1].focus();
    });

    // ── VERIFICAR OTP ──
    document.getElementById("verificarOTP")?.addEventListener("click", async () => {
        const email = sessionStorage.getItem("correoRegistro");
        const token = [...document.querySelectorAll(".otp-input")].map(i => i.value).join("");

        if (token.length < 8) { alert("Ingresa los 6 dígitos del código."); return; }

        const { error } = await supabaseClient.auth.verifyOtp({
            email, token, type: "signup"
        });

        if (error) { alert("Código incorrecto o expirado."); return; }

        const perfil = JSON.parse(sessionStorage.getItem("perfilTemp"));

        const { error: errorPerfil } = await supabaseClient
            .from("perfiles")
            .insert([perfil]);

        if (errorPerfil) { alert("Error al guardar perfil: " + errorPerfil.message); return; }

        sessionStorage.removeItem("correoRegistro");
        sessionStorage.removeItem("perfilTemp");

        alert("¡Correo verificado! Ya puedes iniciar sesión.");

        // Cerrar modal y abrir login
        document.getElementById("modalRegistro").classList.remove("active");
        document.getElementById("modalLogin").classList.add("active");
    });

    // ── LOGIN ──
    const formLogin = document.getElementById("formLogin");

    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();

            const correo   = document.getElementById("correoLogin").value;
            const password = document.getElementById("passwordLogin").value;

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: correo,
                password: password
            });

            if (error) {
                if (error.message.includes("Email not confirmed")) {
                    alert("Debes confirmar tu correo antes de iniciar sesión. Revisa tu Gmail.");
                } else {
                    alert("Correo o contraseña incorrectos.");
                }
                return;
            }

            const { data: perfil, error: errorPerfil } = await supabaseClient
                .from("perfiles")
                .select("*")
                .eq("user_id", data.user.id)
                .single();

            if (errorPerfil) { alert(errorPerfil.message); return; }

            alert("Bienvenido " + perfil.nombre);

            if (perfil.rol === "docente") {
                window.location.href = "/paginas/panel_docente.html";
            } else {
                window.location.href = "/paginas/panel_estudiante.html";
            }
        });
    }

    // ── RECUPERAR CONTRASEÑA ──
    document.getElementById("olvidePassword")?.addEventListener("click", async (e) => {
        e.preventDefault();

        const email = document.getElementById("correoLogin").value.trim();
        if (!email) { alert("Ingresa tu correo electrónico."); return; }

        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: "https://rj-tech-computer.vercel.app/reset-password.html"
        });

        if (error) {
            alert("Error: " + error.message);
        } else {
            alert("Revisa tu correo para restablecer tu contraseña.");
        }
    });
}