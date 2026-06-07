document.addEventListener("DOMContentLoaded", ()=>{

    cargarUsuario();

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

        window.location.href =
        "/index.html";

        return;

    }

    const {
        data:perfil
    } =
    await supabaseClient
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .single();

    document
    .getElementById("saludoUsuario")
    .textContent =
    `Bienvenido ${perfil.nombre} ${perfil.apellido} 👋`;

    document
    .getElementById("rolUsuario")
    .textContent =
    perfil.rol.toUpperCase();

}

async function cerrarSesion(){

    await supabaseClient.auth.signOut();

    window.location.href =
    "/index.html";

}