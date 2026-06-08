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

    console.log("LECTURA:", data);
    console.log("ERROR LECTURA:", error);

    if(error) return;

    const nuevoTotal =
    Number(data.total) + 1;

    console.log("NUEVO TOTAL:", nuevoTotal);

    const { data:updateData,
            error:updateError } =
    await supabaseClient
    .from("visitas")
    .update({
        total:nuevoTotal
    })
    .eq("id",1)
    .select();

    console.log("UPDATE DATA:", updateData);
    console.log("UPDATE ERROR:", updateError);

    document
    .getElementById("contadorVisitas")
    .textContent =
    nuevoTotal;

}
