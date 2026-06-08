/*  para que me dirija cuando ingresa el registro y el inicio de sesion*/
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

console.log("DATA REGISTRO:", data);
console.log("ERROR REGISTRO:", error);

if(error){

    alert(error.message);
    return;

}

if(!data.user){

    alert("No se pudo obtener el usuario.");
    return;

}

const { data: perfilData, error: errorPerfil } =
await supabaseClient
.from("perfiles")
.insert([{

  user_id: data.user.id,
  nombre: nombre,
  apellido: apellido,
  telefono: telefono,
  correo: correo,
  rol: rol

}])
.select();

console.log("PERFIL:", perfilData);
console.log("ERROR PERFIL:", errorPerfil);

if(errorPerfil){

    alert(errorPerfil.message);
    return;

}
            alert("Cuenta creada correctamente");
             formRegistro.reset();
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
            .eq("user_id", data.user.id)
            .single();

if(errorPerfil){

    console.log("ID:", data.user.id);
    console.log("PERFIL:", perfil);
    console.log("ERROR:", errorPerfil);

    alert(errorPerfil.message);

    return;
}

            alert("Bienvenido " + perfil.nombre);

            if(perfil.rol === "docente"){

                window.location.href =
                "/paginas/docentehtml/dashboard.html";

            }else{

                window.location.href =
                "/paginas/estudiantehtml/dashboarde.html";

            }

        });

    }

}