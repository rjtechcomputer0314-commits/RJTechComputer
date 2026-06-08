/* para las  visitas*/
document.addEventListener("DOMContentLoaded", async ()=>{

    const { data, error } =
    await supabaseClient
    .from("visitas")
    .insert([
        {
            total: 1
        }
    ])
    .select();

    console.log(data);
    console.log(error);

});
