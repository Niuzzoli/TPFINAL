// Cambia el fondo del nav cuando bajo
document.addEventListener("DOMContentLoaded", () => {
    const nav = document.querySelector("nav");

    function cambiarFondoHeader() {
        if (window.scrollY > 30) {
            nav.classList.add("nav-scroll");
        } else {
            nav.classList.remove("nav-scroll");
        }
    }

    cambiarFondoHeader();
    window.addEventListener("scroll", cambiarFondoHeader);

    // Menu hamburguesa (celulares y tablets)
    const botonMenu = document.getElementById("boton-menu");

    function cambiarMenu(abierto) {
        nav.classList.toggle("menu-abierto", abierto);
        botonMenu.setAttribute("aria-expanded", abierto);
        botonMenu.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
    }

    botonMenu.addEventListener("click", () => {
        cambiarMenu(!nav.classList.contains("menu-abierto"));
    });

    // Cierra el menu al elegir una opcion
    nav.querySelectorAll("ul a").forEach((enlace) => {
        enlace.addEventListener("click", () => cambiarMenu(false));
    });
});


// Agranda el textarea a medida que se escribe
const textarea = document.getElementById("mensaje");

textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
});


// Envia el formulario 
const contactForm = document.getElementById('contact-form');
const contactSuccess = document.getElementById('contact-success');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Esto es para que la pagina no se recargue

        // Muestra el aviso de mensaje exitoso
        contactForm.style.display = 'none';
        contactSuccess.style.display = 'flex';

        setTimeout(() => {
            contactSuccess.style.display = 'none';
            contactForm.style.display = 'flex';
            contactForm.reset(); // Borra los campos para que aparezcan vacios
        }, 2000);
    });
}
