const formRegistro =
document.getElementById("formRegistro");

formRegistro.addEventListener("submit",
async(e)=>{

    e.preventDefault();

    const nombre =
    document.getElementById("nombreRegistro").value;

    const apellido =
    document.getElementById("apellidoRegistro").value;

    const correo =
    document.getElementById("correoRegistro").value;

    const password =
    document.getElementById("passwordRegistro").value;

    const confirmar =
    document.getElementById("confirmPassword").value;

    // VALIDAR PASSWORD

    if(password !== confirmar){

        alert("Las contraseñas no coinciden");

        return;
    }

    // REGISTRO SUPABASE

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

    console.log(data);

});