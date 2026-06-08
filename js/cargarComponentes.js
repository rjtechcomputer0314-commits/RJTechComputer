/*  HEADER */
fetch("../componentes/header.html")

.then(res => res.text())

.then(data => {

    document.getElementById("header").innerHTML = data;

    /* SUBMENU MOBILE */

    const submenu = document.querySelectorAll(".submenu");

    submenu.forEach(item => {

        const link = item.querySelector("a");

        link.addEventListener("click", (e) => {

            if(window.innerWidth <= 900){

                e.preventDefault();

                item.classList.toggle("active");

            }

        });

    });

});
/*   FOOTER */

fetch("/componentes/footer.html")

.then(res => res.text())

.then(data => {

    document.getElementById("footer").innerHTML = data;

});

/* REGISTRO */

fetch("/componentes/registro.html")

.then(res => res.text())

.then(data => {

    document.getElementById(
        "registro-container"
    ).innerHTML = data;

});

/* LOGIN */

fetch("/componentes/login.html")

.then(res => res.text())

.then(data => {

    document.getElementById(
        "login-container"
    ).innerHTML = data;

});

/* FLOTANTES */

fetch("/componentes/flotantes.html")

.then(res => res.text())

.then(data => {

    document.getElementById(
        "flotantes-container"
    ).innerHTML = data;

});