/*  HEADER */
fetch("/componentes/header.html")
.then(res => res.text())
.then(data => {
    const header = document.getElementById("header");
    if (header) {
        header.innerHTML = data;
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
        actualizarHeader();
    }
});

/*   FOOTER */
fetch("/componentes/footer.html")
.then(res => res.text())
.then(data => {
    const el = document.getElementById("footer");
    if (el) el.innerHTML = data;
});

/* REGISTRO */
fetch("/componentes/registro.html")
.then(res => res.text())
.then(data => {
    const el = document.getElementById("registro-container");
    if (el) el.innerHTML = data;
});

/* LOGIN */
fetch("/componentes/login.html")
.then(res => res.text())
.then(data => {
    const el = document.getElementById("login-container");
    if (el) el.innerHTML = data;
});

/* FLOTANTES */
fetch("/componentes/flotantes.html")
.then(res => res.text())
.then(data => {
    const el = document.getElementById("flotantes-container");
    if (el) el.innerHTML = data;
});