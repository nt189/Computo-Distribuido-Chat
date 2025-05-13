// Función para actualizar la lista de usuarios conectados
function updateConnectedUsers(users) {
    const onlineUsersContainer = document.querySelector('#onlineUsers');
    const chat_info_status = document.getElementById('chat-info-status');
    onlineUsersContainer.innerHTML = '<h3>Usuarios Conectados</h3>'; // Reinicia la lista

    if (users.length === 1) {
        chat_info_status.textContent  = `${users.length} Usuario Conectado`; 
    } else {
        chat_info_status.textContent  = `${users.length} Usuarios Conectados`;
    }
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.classList.add('chat', 'connected-user'); // Añade la clase connected-user
        userElement.setAttribute('data-chatname', user.chatname);
        userElement.setAttribute('data-name', user.name); // Añade data-name
        userElement.setAttribute('data-avatar', user.avatar || 'img/avatardefault.png'); // Añade data-avatar

        userElement.innerHTML = `
            <img src="${user.avatar || 'img/avatardefault.png'}" alt="Avatar">
            <div class="chat-preview">
                <div class="chat-header">
                    <span class="chat-name">${user.name}</span>
                    <span class="Status">Activo</span>
                </div>
            </div>
        `;

        // Añade el event listener para actualizar el chat-info
        userElement.addEventListener('click', function() {
            // Actualiza el título y la imagen del chat-info
            document.getElementById('chat-info-tile').textContent = user.name;
            document.querySelector('#chat-info img').setAttribute('src', user.avatar || 'img/avatardefault.png');
            // Borra los mensajes del área messages-content
            document.getElementById('messages-content').innerHTML = '';
        });

        onlineUsersContainer.appendChild(userElement);
    });
}


// Función para actualizar la lista de usuarios desconectados
function updateDisconnectedUsers(users) {
    const offlineUsersContainer = document.querySelector('#offLineUsers');
    offlineUsersContainer.innerHTML = '<h3>Usuarios Desconectados</h3>'; // Reinicia la lista

    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.classList.add('chat');
        userElement.setAttribute('data-chatname', user.chatname);

        userElement.innerHTML = `
            <img src="${user.avatar || 'img/avatardefault.png'}" alt="Avatar">
            <div class="chat-preview">
                <div class="chat-header">
                    <span class="chat-name">${user.name}</span>
                    <span class="Status">Inactivo</span>
                </div>
            </div>
        `;
        offlineUsersContainer.appendChild(userElement);
    });
}

// Exportar las funciones
export { updateConnectedUsers, updateDisconnectedUsers };   