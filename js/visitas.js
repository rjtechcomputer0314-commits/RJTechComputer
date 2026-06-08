/* para las  visitas*/
document.addEventListener(
    "DOMContentLoaded",
    contarVisita
);

async function contarVisita(){

    if(localStorage.getItem("visitaContada")){

        mostrarVisitas();

        return;
    }

    const { data } =
    await supabaseClient
    .from("visitas")
    .select("*")
    .eq("id",1)
    .single();

    const nuevoTotal =
    Number(data.total) + 1;

    await supabaseClient
    .from("visitas")
    .update({
        total:nuevoTotal
    })
    .eq("id",1);

    localStorage.setItem(
        "visitaContada",
        "si"
    );

    document
    .getElementById("contadorVisitas")
    .textContent =
    nuevoTotal;

}

async function mostrarVisitas(){

    const { data } =
    await supabaseClient
    .from("visitas")
    .select("*")
    .eq("id",1)
    .single();

    document
    .getElementById("contadorVisitas")
    .textContent =
    data.total;

}
