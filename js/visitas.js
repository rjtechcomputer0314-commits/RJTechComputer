/* para las  visitas*/

document.addEventListener(
    "DOMContentLoaded",
    contarVisita
);

async function contarVisita(){

    console.log("Iniciando contador");

    const { data, error } =
    await supabaseClient
    .from("visitas")
    .select("*")
    .eq("id",1)
    .single();

    console.log("DATA:", data);
    console.log("ERROR:", error);

    if(error){
        return;
    }

    const nuevoTotal =
    Number(data.total) + 1;

    console.log("Nuevo total:", nuevoTotal);

    const { error:updateError } =
    await supabaseClient
    .from("visitas")
    .update({
        total:nuevoTotal
    })
    .eq("id",1);

    console.log("UPDATE:", updateError);

    document
    .getElementById("contadorVisitas")
    .textContent =
    nuevoTotal;

}
