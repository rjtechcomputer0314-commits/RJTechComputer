/*  MODALES*/
document.addEventListener("click",(e)=>{
    /* ABRIR REGISTRO */
    if(e.target.id === "abrirModal"){

        document
        .getElementById("modalRegistro")
        .classList.add("active");
    }
    /* ABRIR LOGIN */

    if(e.target.id === "abrirLogin"){

        document
        .getElementById("modalLogin")
        .classList.add("active");
    }

    /* CERRAR REGISTRO */

    if(e.target.id === "cerrarRegistro"){

        document
        .getElementById("modalRegistro")
        .classList.remove("active");
    }

    /* CERRAR LOGIN */

    if(e.target.id === "cerrarLogin"){

        document
        .getElementById("modalLogin")
        .classList.remove("active");
    }

    /* IR LOGIN */

    if(e.target.id === "irLogin"){

        e.preventDefault();

        document
        .getElementById("modalRegistro")
        .classList.remove("active");

        document
        .getElementById("modalLogin")
        .classList.add("active");
    }

    /* IR REGISTRO */

    if(e.target.id === "irRegistro"){

        e.preventDefault();

        document
        .getElementById("modalLogin")
        .classList.remove("active");

        document
        .getElementById("modalRegistro")
        .classList.add("active");
    }

    /* MOSTRAR PASSWORD */

    if(e.target.classList.contains("toggle-password")){

        const input =
        document.getElementById(
            e.target.dataset.target
        );

        if(input.type === "password"){

            input.type = "text";

            e.target.classList.replace(
                "fa-eye",
                "fa-eye-slash"
            );

        }else{

            input.type = "password";

            e.target.classList.replace(
                "fa-eye-slash",
                "fa-eye"
            );
        }
    }

});
