(async () => {

    const span = document.getElementById("contadorVisitas");
    if (!span) return;

    try {

        const { data, error } = await supabaseClient
            .from("visitas")
            .select("total")
            .eq("id", 1)
            .single();

        if (error) throw error;

        let total = data.total || 0;

        if (!sessionStorage.getItem("visita_contada")) {

            sessionStorage.setItem("visita_contada", "1");

            total++;

            await supabaseClient
                .from("visitas")
                .update({ total })
                .eq("id", 1);
        }

        span.textContent = total.toLocaleString("es-PE");

    } catch (e) {

        console.error("Error contador:", e);

    }

})();