let webSocket;
let user = {};
let diffMethod = 'broadcast';
let selectedUsers = [];


// Cuando el WebSocket se abre 
function initializeWebSocket() {
    webSocket = new WebSocket('ws://192.168.149.24:8888'); 

    webSocket.onopen = function (event) {
        console.log('WebSocket conectado');
        reconnectAttempts = 0; 
        let messageXML;

        if (localStorage.getItem('user')) {
            user = JSON.parse(localStorage.getItem('user'));
            messageXML = `
                <message>
                    <case>login</case>
                    <userid>${user.userid}</userid>
                    <username>${user.username}</username>
                </message>`;
            webSocket.send(messageXML);
            document.getElementById('whoami').innerHTML = user.username;
        } 
        else {
            let username = null;
            while (!username || username.trim() === '') {
                username = prompt('Elige un nombre de usuario');
                if (username && username.trim() !== '') {
                    messageXML = `
                        <message>
                            <case>register</case>
                            <username>${username.trim()}</username>
                        </message>`;
                    webSocket.send(messageXML);
                    document.getElementById('whoami').innerHTML = username;
                } 
                else {
                    alert('El nombre de usuario no puede estar vacío');
                    username = null;
                }
            }
        }
    };
}
initializeWebSocket();

let reconnectAttempts = 0;
const maxReconnectAttempts = 10;

function attemptReconnect() {
    if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`Intentando reconectar (${reconnectAttempts}/${maxReconnectAttempts})...`);
        setTimeout(() => {
            initializeWebSocket(); // Reintenta inicializar el WebSocket
        }, 5000); // Espera 5 segundos antes de intentar reconectar
    } else {
        console.error('Se alcanzó el número máximo de intentos de reconexión.');
    }
}

function updateUserPreview(chatnameOrName, lastMessage, lastTime) {
    // Busca por userid (data-chatname)
    let userDiv = document.querySelector(`.connected-user[data-chatname="${chatnameOrName}"]`);
    // Si no lo encuentra, busca por username (data-name)
    if (!userDiv) {
        userDiv = document.querySelector(`.connected-user[data-name="${chatnameOrName}"]`);
    }
    if (userDiv) {
        const messageSpan = userDiv.querySelector('.chat-message');
        const timeSpan = userDiv.querySelector('.chat-time');
        if (messageSpan) messageSpan.textContent = lastMessage;
        if (timeSpan) timeSpan.textContent = lastTime;
    }
}

// Cuando se recibe un mensaje del servidor
webSocket.onmessage = function (event) {
    const parser = new DOMParser();
    let xmlDoc;

    try {
        xmlDoc = parser.parseFromString(event.data, "text/xml");
    } 
    catch (e) {
        console.error("Error al analizar el XML:", e);
        return;
    }

    const caseElement = xmlDoc.getElementsByTagName("case")[0];
    if (!caseElement) {
        console.warn("No se encontró el elemento <case> en el XML");
        return;
    }

    switch (caseElement.textContent) {
        case 'login':
            const useridElement = xmlDoc.getElementsByTagName("userid")[0];
            const usernameElement = xmlDoc.getElementsByTagName("username")[0];

            if (useridElement && usernameElement) {
                user['userid'] = useridElement.textContent;
                user['username'] = usernameElement.textContent;
                localStorage.setItem('user', JSON.stringify(user));
                console.log('Usuario actualizado:', user);
            } else {
                console.warn("Faltan datos en la respuesta de login.");
            }
            break;

        case 'message':
            let messagehtml = xmlDoc.getElementsByTagName("htmlmessage")[0];
            if (messagehtml) {
                document.getElementById('messages-content').innerHTML += messagehtml.textContent;
                localStorage.setItem('ChatHistory', document.getElementById('messages-content').innerHTML);

                // Scroll automático al último mensaje
                const messagesContent = document.getElementById('messages-content');
                messagesContent.scrollTop = messagesContent.scrollHeight;

                // Actualiza el preview del usuario
                const senderElem = xmlDoc.getElementsByTagName("sender")[0];
                const textElem = xmlDoc.getElementsByTagName("textmessage")[0];
                const timeElem = xmlDoc.getElementsByTagName("time")[0];
                if (senderElem && textElem && timeElem) {
                    updateUserPreview(senderElem.textContent, textElem.textContent, timeElem.textContent);
                }
            }
        break;

        case 'error':
            handleError(xmlDoc);
            break;
        case 'updateUsers':
            const connectedUsers = Array.from(xmlDoc.getElementsByTagName("connectedUser")).map(user => ({
                name: user.getAttribute('name'),
                chatname: user.getAttribute('chatname'),
                avatar: user.getAttribute('avatar'),
                totalUsers: user.getAttribute('totalUsers')
            }));

            const disconnectedUsers = Array.from(xmlDoc.getElementsByTagName("disconnectedUser")).map(user => ({
                name: user.getAttribute('name'),
                chatname: user.getAttribute('chatname'),
                avatar: user.getAttribute('avatar')
            }));

            updateConnectedUsers(connectedUsers);
            updateDisconnectedUsers(disconnectedUsers);
        break;

        default:
            console.warn("Caso no reconocido:", caseElement.textContent);
    }
};

// Función para actualizar el botón y el método de envío
function updateSendButtonAndMethod() {
    const sendButton = document.querySelector('#messages-input button');
    if (selectedUsers.length === 0) {
        diffMethod = 'broadcast';
        sendButton.textContent = 'Enviar a todos';
    } else if (selectedUsers.length === 1) {
        diffMethod = selectedUsers[0].dataset.chatname;
        sendButton.textContent = `Enviar a ${selectedUsers[0].querySelector('.chat-name').textContent}`;
    } else if (selectedUsers.length > 1) {
        diffMethod = selectedUsers.map(u => u.dataset.chatname).join(',');
        sendButton.textContent = `Enviar a ${selectedUsers.length}`;
    }
}

// Función para manejar la selección visual y lógica
function handleUserSelection(event) {
    const userDiv = event.currentTarget;
    if (event.ctrlKey) {
        // Selección múltiple con Ctrl
        if (selectedUsers.includes(userDiv)) {
            userDiv.classList.remove('selected-user');
            selectedUsers = selectedUsers.filter(u => u !== userDiv);
        } else {
            userDiv.classList.add('selected-user');
            selectedUsers.push(userDiv);
        }
    } else {
        // Si ya está seleccionado y hay más de uno, solo lo deselecciona
        if (selectedUsers.length > 1 && selectedUsers.includes(userDiv)) {
            userDiv.classList.remove('selected-user');
            selectedUsers = selectedUsers.filter(u => u !== userDiv);
        } else {
            // Selección simple (solo uno)
            document.querySelectorAll('.connected-user.selected-user').forEach(div => div.classList.remove('selected-user'));
            selectedUsers = [];
            userDiv.classList.add('selected-user');
            selectedUsers.push(userDiv);
        }
    }
    updateSendButtonAndMethod();
}


// Añadir listeners después de actualizar la lista de usuarios conectados
import { updateConnectedUsers as originalUpdateConnectedUsers, updateDisconnectedUsers } from './UserListManager.js';

function updateConnectedUsers(users) {
    originalUpdateConnectedUsers(users);
    // Añadir listeners a los usuarios conectados
    document.querySelectorAll('.connected-user').forEach(div => {
        div.addEventListener('click', handleUserSelection);
    });
    // Limpiar selección si los usuarios cambian
    selectedUsers = [];
    updateSendButtonAndMethod();
}

// Sobrescribe la importación
export { updateConnectedUsers, updateDisconnectedUsers };

// Modifica sendMessage para soportar unicast/multicast
function sendMessage() {
    const messageInput = document.getElementById('messages-input').querySelector('input');
    const message = messageInput.value.trim();

    if (message) {
        let messageXML;
        if (selectedUsers.length === 0) {
            // Broadcast
            messageXML = `
                <message>
                    <case>broadcast</case>
                    <sender>${user.username}</sender>
                    <textmessage>${message}</textmessage>
                    <time>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                </message>`;
            console.log(messageXML)
        } 
        else if (selectedUsers.length === 1) {
            // Unicast
            messageXML = `
                <message>
                    <case>unicast</case>
                    <sender>${user.username}</sender>
                    <addressee>${selectedUsers[0].dataset.chatname}</addressee>
                    <textmessage>${message}</textmessage>
                    <time>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                </message>`;

            let template = `
                <div class="message-container my-messages">
                    <div class="sender-name">
                        <span class="method-tag">[unicast] para ${selectedUsers[0].querySelector('.chat-name').textContent}</span>
                    </div>
                    <div class="message-content">
                        <span>${message}</span>
                        <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            `;
            document.getElementById('messages-content').innerHTML += template;
            localStorage.setItem('ChatHistory', document.getElementById('messages-content').innerHTML);
        } 
        else {
            // Multicast
            const addresseeNames = selectedUsers
                .map(u => u.querySelector('.chat-name').textContent)
                .join(', ');

            messageXML = `
                <message>
                    <case>multicast</case>
                    <sender>${user.username}</sender>
                    <addressee>${selectedUsers.map(u => u.dataset.chatname).join(',')}</addressee>
                    <addresseeName>${addresseeNames}</addresseeName>
                    <textmessage>${message}</textmessage>
                    <time>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                </message>`;
        }
        webSocket.send(messageXML);
        messageInput.value = '';

        // Deseleccionar usuarios después de enviar
        document.querySelectorAll('.connected-user.selected-user').forEach(div => div.classList.remove('selected-user'));
        selectedUsers = [];
        updateSendButtonAndMethod();
    } else {
        alert('El mensaje no puede estar vacío');
    }
}

// Añade manejadores de errores
webSocket.onerror = function(error) {
    console.error('Error en WebSocket:', error);
};

webSocket.onclose = function(event) {
    console.log('Conexión cerrada:', event);
    attemptReconnect(); 
};

// Conectar botón de enviar
document.querySelector('#messages-input button').addEventListener('click', sendMessage);
document.querySelector('#messages-input input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});

window.addEventListener('beforeunload', function () {
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(`
            <message>
                <case>logout</case>
                <userId>${user.userid}</userId>
                <username>${user.username}</username>
            </message>`); 
        webSocket.close();
        console.log('WebSocket cerrado antes de salir de la página.');
    }
});

function Chatload() {
    const ChatHistory = localStorage.getItem('ChatHistory');
    if (ChatHistory) {
        document.getElementById('messages-content').innerHTML = ChatHistory;
    }
};
Chatload()
