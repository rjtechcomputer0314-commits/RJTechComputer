const SUPABASE_URL =
"https://lqsyfqnrvkihjsvginmq.supabase.co";

const SUPABASE_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxc3lmcW5ydmtpaGpzdmdpbm1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDc5NTUsImV4cCI6MjA5NDc4Mzk1NX0.4Jrn784Mo9TABbdapUaHdfl3SJbbeI9qWQMGN8Oszk8";

const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/* para las  visitas*/

document.addEventListener(
    "DOMContentLoaded",
    contarVisita
);

async function contarVisita(){

    if(
        localStorage.getItem("visitado")
    ){

        mostrarTotal();

        return;

    }

    const { data } =
    await supabaseClient
    .from("visitas")
    .select("*")
    .eq("id",1)
    .single();

    const nuevoTotal =
    data.total + 1;

    await supabaseClient
    .from("visitas")
    .update({
        total:nuevoTotal
    })
    .eq("id",1);

    localStorage.setItem(
        "visitado",
        "si"
    );

    document
    .getElementById("contadorVisitas")
    .textContent =
    nuevoTotal;

}

async function mostrarTotal(){

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