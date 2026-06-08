/* para las  visitas*/

document.addEventListener(
    "DOMContentLoaded",
    contarVisita
);

async function contarVisita(){

    console.log("Entró a contarVisita");

    const resultado =
    await supabaseClient
    .from("visitas")
    .select("*");

    console.log(resultado);

}
