document.addEventListener("DOMContentLoaded", ()=>{

    cargarUsuario();

    cargarCantidadCursos();

    
    cargarCantidadEstudiantes();

    cargarCantidadDocentes();


    document
    .getElementById("cerrarSesion")
    .addEventListener("click", cerrarSesion);

});

async function cargarUsuario(){

    const {
        data:{user}
    } =
    await supabaseClient.auth.getUser();

    if(!user){

        window.location.href = "/index.html";

        return;

    }

    const {
        data:perfil,
        error
    } =
    await supabaseClient
    .from("perfiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

    if(error){

        console.log(error);

        return;

    }

    document
    .getElementById("saludoUsuario")
    .textContent =
    `Bienvenido ${perfil.nombre} ${perfil.apellido} 👋`;

    document
    .getElementById("rolUsuario")
    .textContent =
    perfil.rol.toUpperCase();

}

async function cargarCantidadCursos(){

    const {
        data:{user}
    } =
    await supabaseClient.auth.getUser();

    if(!user) return;

    const {
        data,
        error
    } =
    await supabaseClient
    .from("cursos")
    .select("*")
    .eq("docente_id", user.id);

    if(error){

        console.log(error);

        return;

    }

    document
    .getElementById("totalCursos")
    .textContent =
    data.length;

}

async function cerrarSesion(){

    await supabaseClient.auth.signOut();

    window.location.href =
    "/index.html";

}

const btnNuevoCurso =
document.getElementById("btnNuevoCurso");

if(btnNuevoCurso){

    btnNuevoCurso.addEventListener(
        "click",
        ()=>{

            window.location.href =
            "cursosdoc.html";

        }
    );

}


    // para que se abra en la misma ventana el crear curso
function abrirmodalCurso(){
    document.getElementById("modalCurso").style.display = "flex";
}

function cerrarmodalCurso(){
    document.getElementById("modalCurso").style.display = "none";
}



// ==========================
// CONTAR ESTUDIANTES
// ==========================

async function cargarCantidadEstudiantes(){

    const {
        count,
        error
    } =
    await supabaseClient
    .from("perfiles")
    .select("*",{
        count:"exact",
        head:true
    })
    .eq("rol","estudiante");

    if(error){

        console.log(error);

        return;

    }

    document
    .getElementById("contadorEstudiantes")
    .textContent =
    count;

}

// ==========================
// CONTAR DOCENTES
// ==========================

async function cargarCantidadDocentes(){

    const {
        count,
        error
    } =
    await supabaseClient
    .from("perfiles")
    .select("*",{
        count:"exact",
        head:true
    })
    .eq("rol","docente");

    if(error){

        console.log(error);

        return;

    }

    document
    .getElementById("contadorDocentes")
    .textContent =
    count;

}
