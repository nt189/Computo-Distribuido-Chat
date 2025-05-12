document.getElementById("toggle-sidebar").addEventListener("click", function () {
    const body = document.body;
    const sidebar = document.getElementById("right-sidebar");
    const toggleButton = document.getElementById("toggle-sidebar");

    // Alternar la clase 'active' en el sidebar
    sidebar.classList.toggle("active");

    // Alternar la clase 'sidebar-active' en el body
    if (sidebar.classList.contains("active")) {
        body.classList.add("sidebar-active");
        toggleButton.style.display = "none"; // Ocultar el botón toggle-sidebar
    } else {
        body.classList.remove("sidebar-active");
    }
});

document.getElementById("close-sidebar").addEventListener("click", function () {
    const body = document.body;
    const sidebar = document.getElementById("right-sidebar");
    const toggleButton = document.getElementById("toggle-sidebar");

    // Eliminar la clase 'active' del sidebar
    sidebar.classList.remove("active");

    // Eliminar la clase 'sidebar-active' del body
    body.classList.remove("sidebar-active");

    // Mostrar el botón toggle-sidebar
    toggleButton.style.display = "block";
});

document.getElementById("toggle-left-navbar").addEventListener("click", function () {
    const leftNavbar = document.getElementById("left-navbar");

    // Alternar la clase 'active' en el left-navbar
    leftNavbar.classList.toggle("active");
});

