/* inicio*/

document.addEventListener("DOMContentLoaded",()=>{

    cargarCursos();

    document.getElementById("guardarCurso")
    .addEventListener("click",crearCurso);

});
/* para crear curso*/
async function crearCurso(){

    const {data:{user}} =
    await supabaseClient.auth.getUser();

    if(!user){
        alert("Debe iniciar sesión");
        return;
    }

    const nombre =
    document.getElementById("nombreCurso").value.trim();

    const descripcion =
    document.getElementById("descripcionCurso").value.trim();

    if(!nombre){
        alert("Ingrese un nombre");
        return;
    }

    const {error} =
    await supabaseClient
    .from("cursos")
    .insert([{
        nombre,
        descripcion,
        docente_id:user.id
    }]);

if(error){

    console.log(error);

    alert(error.message);

    return;
}

    alert("Curso creado");

    document.getElementById("nombreCurso").value="";
    document.getElementById("descripcionCurso").value="";

    cargarCursos();

}
/* para cargar curso*/
async function cargarCursos(){

    const {data:{user}} =
    await supabaseClient.auth.getUser();

    if(!user) return;

    const {data,error} =
    await supabaseClient
    .from("cursos")
    .select("*")
    .eq("docente_id",user.id)
    .order("fecha_creacion",{ascending:false});

    if(error){
        console.log(error);
        return;
    }

    const lista =
    document.getElementById("listaCursos");

    lista.innerHTML="";

    data.forEach(curso=>{

        lista.innerHTML += `
        <div class="curso">
            <h3>${curso.nombre}</h3>
            <p>${curso.descripcion || ""}</p>
        </div>`;
    });

}