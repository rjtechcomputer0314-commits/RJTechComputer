/* para las  visitas*/

document.addEventListener(
    "DOMContentLoaded",
    contarVisita
);

async function contarVisita(){

    const { data, error } =
    await supabaseClient
    .from("visitas")
    .select("*")
    .eq("id",1)
    .single();

    if(error){

        console.log(error);

        return;

    }

    const nuevoTotal =
    data.total + 1;

    await supabaseClient
    .from("visitas")
    .update({
        total:nuevoTotal
    })
    .eq("id",1);

    document
    .getElementById("contadorVisitas")
    .textContent =
    nuevoTotal;

}