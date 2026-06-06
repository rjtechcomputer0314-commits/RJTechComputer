document.addEventListener("DOMContentLoaded", ()=>{

    cargarCursos();

    document
    .getElementById("btnCrearCurso")
    .addEventListener("click", crearCurso);

});

async function crearCurso(){

    const nombre =
    document.getElementById("nombreCurso").value;

    const descripcion =
    document.getElementById("descripcionCurso").value;

    const {
        data:{user}
    } =
    await supabaseClient.auth.getUser();

    const { error } =
    await supabaseClient
    .from("cursos")
    .insert([{

        docente_id:user.id,
        nombre:nombre,
        descripcion:descripcion

    }]);

    if(error){

        alert(error.message);
        return;

    }

    alert("Curso creado");

    cargarCursos();

}

async function cargarCursos(){

    const contenedor =
    document.getElementById("listaCursos");

    const { data } =
    await supabaseClient
    .from("cursos")
    .select("*");

    contenedor.innerHTML = "";

    data.forEach(curso=>{

        contenedor.innerHTML += `
            <div class="card-curso">

                <h3>${curso.nombre}</h3>

                <p>${curso.descripcion}</p>

            </div>
        `;

    });

}