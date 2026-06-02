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

            const nombre =
            document.getElementById("nombreRegistro").value;

            const apellido =
            document.getElementById("apellidoRegistro").value;

            const telefono =
            document.getElementById("telefonoRegistro").value;

            const rol =
            document.getElementById("rolRegistro").value;

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

const { error: errorPerfil } =
await supabaseClient
.from("perfiles")
.insert([{

    id:data.user.id,
    nombre:nombre,
    apellido:apellido,
    telefono:telefono,
    correo:correo,
    rol:rol

}]);

if(errorPerfil){

    console.log(errorPerfil);

    alert(errorPerfil.message);

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

            const { data: perfil, error: errorPerfil } =
            await supabaseClient
            .from("perfiles")
            .select("*")
            .eq("id", data.user.id)
            .single();

            if(errorPerfil){

                alert("Perfil no encontrado");
                return;

            }

            alert("Bienvenido " + perfil.nombre);

            if(perfil.rol === "docente"){

                window.location.href =
                "/paginas/docentehtml/dashboard.html";

            }else{

                window.location.href =
                "/paginas/estudiantehtml/dashboard.html";

            }

        });

    }

}