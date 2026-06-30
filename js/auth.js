document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { iniciarAuth(); }, 800);
});

function iniciarAuth() {

    // ── REGISTRO ──
    const formRegistro = document.getElementById("formRegistro");

    if (formRegistro) {
        formRegistro.addEventListener("submit", async (e) => {
            e.preventDefault();

            const nombre    = document.getElementById("nombreRegistro").value.trim();
            const apellido  = document.getElementById("apellidoRegistro").value.trim();
            const telefono  = document.getElementById("telefonoRegistro").value.trim();
            const rol       = document.getElementById("rolRegistro").value;
            const correo    = document.getElementById("correoRegistro").value.trim();
            const password  = document.getElementById("passwordRegistro").value;
            const confirmar = document.getElementById("confirmPassword").value;

            if (!rol)                   { showToast("Selecciona un tipo de cuenta.", "advertencia"); return; }
            if (password !== confirmar) { showToast("Las contraseñas no coinciden.", "error");       return; }
            if (password.length < 6)    { showToast("La contraseña debe tener al menos 6 caracteres.", "advertencia"); return; }

            const btnSubmit = formRegistro.querySelector("button[type='submit']");
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Creando cuenta…";

            const { data, error } = await supabaseClient.auth.signUp({
                email: correo,
                password: password
            });

            if (error) {
                showToast(error.message, "error");
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fas fa-user-plus" style="margin-right:8px"></i>REGISTRARME';
                return;
            }
            if (!data.user) {
                showToast("No se pudo obtener el usuario.", "error");
                btnSubmit.disabled = false;
                return;
            }

            sessionStorage.setItem("correoRegistro", correo);
            sessionStorage.setItem("perfilTemp", JSON.stringify({
                user_id: data.user.id,
                nombre, apellido, telefono, correo, rol
            }));

            const seccionOTP = document.getElementById("seccionOTP");
            if (seccionOTP) {
                seccionOTP.style.display = "block";
                seccionOTP.scrollIntoView({ behavior: "smooth" });
                const primerInput = seccionOTP.querySelector(".otp-input");
                if (primerInput) primerInput.focus();
            }

            showToast("Te enviamos un código de verificación a tu correo.", "info", 6000);
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

        if (token.length < 8) { showToast("Ingresa los 8 dígitos del código.", "advertencia"); return; }

        const btnVerificar = document.getElementById("verificarOTP");
        btnVerificar.disabled = true;
        btnVerificar.textContent = "Verificando…";

        const { error } = await supabaseClient.auth.verifyOtp({
            email, token, type: "signup"
        });

        if (error) {
            showToast("Código incorrecto o expirado: " + error.message, "error");
            btnVerificar.disabled = false;
            btnVerificar.textContent = "Verificar código";
            return;
        }

        const perfil = JSON.parse(sessionStorage.getItem("perfilTemp"));

        // Eliminar perfil duplicado antes de insertar
        await supabaseClient.from("perfiles").delete().eq("user_id", perfil.user_id);

        const { error: errorPerfil } = await supabaseClient
            .from("perfiles")
            .insert([perfil]);

        if (errorPerfil) {
            showToast("Error al guardar perfil: " + errorPerfil.message, "error");
            btnVerificar.disabled = false;
            btnVerificar.textContent = "Verificar código";
            return;
        }

        sessionStorage.removeItem("correoRegistro");
        sessionStorage.removeItem("perfilTemp");

        showToast("¡Correo verificado! Ya puedes iniciar sesión.", "exito", 5000);

        document.getElementById("modalRegistro").classList.remove("active");
        document.getElementById("modalLogin").classList.add("active");
    });

    // ── LOGIN ──
    const formLogin = document.getElementById("formLogin");

    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();

            const correo   = document.getElementById("correoLogin").value.trim();
            const password = document.getElementById("passwordLogin").value;

            const btnSubmit = formLogin.querySelector("button[type='submit']");
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Ingresando…";

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: correo,
                password: password
            });

            if (error) {
                if (error.message.includes("Email not confirmed")) {
                    showToast("Debes confirmar tu correo antes de iniciar sesión.", "advertencia");
                } else {
                    showToast("Correo o contraseña incorrectos.", "error");
                }
                btnSubmit.disabled = false;
                btnSubmit.textContent = "INGRESAR";
                return;
            }

            const { data: perfiles, error: errorPerfil } = await supabaseClient
                .from("perfiles")
                .select("*")
                .eq("user_id", data.user.id);

            if (errorPerfil) {
                showToast("Error al obtener perfil: " + errorPerfil.message, "error");
                btnSubmit.disabled = false;
                btnSubmit.textContent = "INGRESAR";
                return;
            }

            if (!perfiles || perfiles.length === 0) {
                showToast("No se encontró tu perfil. Contacta al administrador.", "error");
                btnSubmit.disabled = false;
                btnSubmit.textContent = "INGRESAR";
                return;
            }

            const perfil = perfiles[0];

            showToast("¡Bienvenido, " + perfil.nombre + "! Redirigiendo…", "exito", 2500);

            setTimeout(() => {
                if (perfil.rol === "administrador") {
                    window.location.href = "/paginas/panel_admin.html";
                } else if (perfil.rol === "docente") {
                    window.location.href = "/paginas/panel_docente.html";
                } else {
                    window.location.href = "/paginas/panel_estudiante.html";
                }
            }, 1500);
        });
    }

    // ── RECUPERAR CONTRASEÑA ──
    document.getElementById("olvidePassword")?.addEventListener("click", async (e) => {
        e.preventDefault();

        const email = document.getElementById("correoLogin").value.trim();
        if (!email) { showToast("Ingresa tu correo electrónico primero.", "advertencia"); return; }

        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + "/reset-password.html"
        });

        if (error) {
            showToast("Error: " + error.message, "error");
        } else {
            showToast("Revisa tu correo para restablecer tu contraseña.", "info", 6000);
        }
    });
}
