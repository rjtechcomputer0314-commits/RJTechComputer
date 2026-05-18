/* =========================================
ESTE ES DEL TEMA OSCURO Y CLARO
========================================= */

document.addEventListener("click",(e)=>{

    const boton =
    e.target.closest("#themeToggle");

    if(boton){

        document.body.classList.toggle(
            "dark-mode"
        );

        const icono =
        boton.querySelector("i");

        if(document.body.classList.contains(
            "dark-mode"
        )){

            icono.classList.replace(
                "fa-moon",
                "fa-sun"
            );

            localStorage.setItem(
                "modo",
                "oscuro"
            );

        }else{

            icono.classList.replace(
                "fa-sun",
                "fa-moon"
            );

            localStorage.setItem(
                "modo",
                "claro"
            );
        }
    }
});

/* =========================================
   RECUPERAR TEMA
========================================= */

window.addEventListener("load",()=>{

    const boton =
    document.getElementById(
        "themeToggle"
    );

    if(localStorage.getItem("modo")
    === "oscuro"){

        document.body.classList.add(
            "dark-mode"
        );

        if(boton){

            boton
            .querySelector("i")
            .classList.replace(
                "fa-moon",
                "fa-sun"
            );
        }
    }

});