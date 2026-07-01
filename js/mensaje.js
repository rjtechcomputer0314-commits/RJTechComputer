
/*  mensaje que aparece en el areas de aprendizaje que dice en proceso de eleaboración*/
const mensaje =
document.querySelectorAll(".mensaje");

const mensajeBox =
document.getElementById("mensajeBox");

mensaje.forEach(boton=>{

    boton.addEventListener("click",(e)=>{

        e.preventDefault();

        mensajeBox.classList.add("active");

        setTimeout(()=>{

            mensajeBox.classList.remove("active");

        },4000);

    });

});