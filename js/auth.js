document.addEventListener("DOMContentLoaded", ()=>{

    setTimeout(()=>{

        iniciarAuth();

    },800);

});

function iniciarAuth(){

    // REGISTRO

    const formRegistro =
    document.getElementById("formRegistro");

    if(formRegistro){

        formRegistro.addEventListener("submit",
        async(e)=>{

            e.preventDefault();

            const correo =
            document.getElementById("correoRegistro").value;

            const password =
            document.getElementById("passwordRegistro").value;

            const confirmar =
            document.getElementById("confirmPassword").value;

            if(password !== confirmar){

                alert("Las contraseñas no coinciden");

                return;
            }

            const { data, error } =
            await supabaseClient.auth.signUp({

                email:correo,
                password:password

            });

            if(error){

                alert(error.message);

                return;
            }

            alert("Cuenta creada correctamente");

        });

    }

    // LOGIN

    const formLogin =
    document.getElementById("formLogin");

    if(formLogin){

        formLogin.addEventListener("submit",
        async(e)=>{

            e.preventDefault();

            const correo =
            document.getElementById("correoLogin").value;

            const password =
            document.getElementById("passwordLogin").value;

            const { data, error } =
            await supabaseClient.auth.signInWithPassword({

                email:correo,
                password:password

            });

            if(error){

                alert("Correo o contraseña incorrectos");

                return;
            }

            alert("Bienvenido");

            window.location.href =
            "/paginas/docentehtml/dashboard.html";

        });

    }

}