/* =========================================
   HEADER
========================================= */

fetch("../componentes/header.html")

.then(res => res.text())

.then(data => {

    document.getElementById("header").innerHTML = data;

});

/* =========================================
   FOOTER
========================================= */

fetch("../componentes/footer.html")

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
/* =========================================
   DARK MODE
========================================= */
/* FLOTANTES */

fetch("../componentes/flotantes.html")

.then(res => res.text())

.then(data => {

    document.getElementById(
        "flotantes-container"
    ).innerHTML = data;

});