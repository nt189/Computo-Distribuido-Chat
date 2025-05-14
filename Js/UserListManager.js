// Función para actualizar la lista de usuarios conectados
function updateConnectedUsers(users) {
    const onlineUsersContainer = document.querySelector('#onlineUsers');
    const chat_info_status = document.getElementById('chat-info-status');
    onlineUsersContainer.innerHTML = '<h6 style="font-weight: bold;">Usuarios Conectados</h6>'; // Reinicia la lista

    if (users.length === 1) {
        chat_info_status.textContent  = `${users.length} Usuario Conectado`; 
    } else {
        chat_info_status.textContent  = `${users.length} Usuarios Conectados`;
    }
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.classList.add('chat', 'connected-user');
        userElement.setAttribute('data-chatname', user.chatname);
        userElement.setAttribute('data-name', user.name);
        userElement.setAttribute('data-avatar', user.avatar || 'img/avatardefault.png');

        userElement.innerHTML = `
            <img src="${user.avatar || 'img/avatardefault.png'}" alt="Avatar">
            <div class="chat-preview">
                <div class="chat-header">
                    <span class="chat-name">${user.name}</span>
                    <span class="chat-time">${user.lastTime || ''}</span>
                </div>
                <div class="chat-header">
                    <span class="chat-message">${user.lastMessage || ''}</span>
                    <span class="Status" style="color: green;">•</span>
                </div>
            </div>
        `;

        userElement.addEventListener('click', function() {
            document.getElementById('chat-info-tile').textContent = user.name;
            document.querySelector('#chat-info img').setAttribute('src', user.avatar || 'img/avatardefault.png');
            document.getElementById('messages-content').innerHTML = '';
        });

        onlineUsersContainer.appendChild(userElement);
    });
}

// Función para actualizar la lista de usuarios desconectados
function updateDisconnectedUsers(users) {
    const offlineUsersContainer = document.querySelector('#offLineUsers');
    offlineUsersContainer.innerHTML = '<h6 style="font-weight: bold;">Usuarios desconectados</h6>'; // Reinicia la lista

    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.classList.add('chat');
        userElement.setAttribute('data-chatname', user.chatname);

        userElement.innerHTML = `
            <img src="${user.avatar || 'img/avatardefault.png'}" alt="Avatar">
            <div class="chat-preview">
                <div class="chat-header">
                    <span class="chat-name">${user.name}</span>
                    <span class="chat-time">${user.lastTime || ''}</span>
                </div>
                <div class="chat-header">
                    <span class="chat-message">${user.lastMessage || ''}</span>
                    <span class="Status" style="color: red;">•</span>
                </div>
            </div>
        `;
        offlineUsersContainer.appendChild(userElement);
    });
}

// Exportar las funciones
export { updateConnectedUsers, updateDisconnectedUsers };