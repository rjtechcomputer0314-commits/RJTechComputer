/*  para el menú de hamburguesa que aparece en pantalla de celular*/
document.addEventListener("DOMContentLoaded", ()=>{

    const esperarHeader = setInterval(()=>{

        const menuToggle =
        document.getElementById("menu-toggle");

        const navMenu =
        document.getElementById("nav-menu");

        if(menuToggle && navMenu){

            clearInterval(esperarHeader);

            menuToggle.addEventListener("click", ()=>{

                navMenu.classList.toggle("active");

            });

        }

    },100);

});

/*  BOTÓN QUE ESTÁ EL WATSAP Y EL TELÉFONO*/

document.addEventListener("click",(e)=>{

    const mainBtn =
    e.target.closest("#mainFloatBtn");

    if(mainBtn){

        const floatItems =
        document.getElementById("floatItems");

        floatItems.classList.toggle("active");
    }

});


/*   PARA LAS PREGUNTAS DEL INDEX QUE ESTA */

const preguntas =
document.querySelectorAll(".pregunta-item");

preguntas.forEach((item)=>{

    const titulo =
    item.querySelector(".pregunta-titulo");

    titulo.addEventListener("click",()=>{

        item.classList.toggle("active");

    });
);
