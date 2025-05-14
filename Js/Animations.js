document.getElementById('toggle-left-navbar').addEventListener('click', function() {
    document.getElementById('left-navbar').classList.toggle('active');
});

// Opcional: Ocultar el navbar al hacer clic fuera de él (en móvil)
document.addEventListener('click', function(event) {
    const navbar = document.getElementById('left-navbar');
    const toggleBtn = document.getElementById('toggle-left-navbar');
    if (window.innerWidth <= 768 && navbar.classList.contains('active')) {
        if (!navbar.contains(event.target) && event.target !== toggleBtn) {
            navbar.classList.remove('active');
        }
    }
});
