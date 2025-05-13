let webSocket = new WebSocket('ws://192.168.1.68:8888');
let user = {};
let chat_selected = 'global-chat';

import { updateConnectedUsers, updateDisconnectedUsers } from './UserListManager.js';

// Cuando el WebSocket se abre 
function initializeWebSocket() {
    webSocket = new WebSocket('ws://192.168.1.68:8888'); // Crea una nueva instancia

    webSocket.onopen = function (event) {
        console.log('WebSocket conectado');
        reconnectAttempts = 0; // Reinicia el contador de intentos de reconexión
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
                } else {
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

// Cuando se recibe un mensaje del servidor
webSocket.onmessage = function (event) {
    const parser = new DOMParser();
    let xmlDoc;

    try {
        xmlDoc = parser.parseFromString(event.data, "text/xml");
    } catch (e) {
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
            let forchat = xmlDoc.getElementsByTagName("for")[0];
            let messagehtml = xmlDoc.getElementsByTagName("htmlmessage")[0];
            document.getElementById('messages-content').innerHTML += messagehtml.textContent;
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

function sendMessage() {
    const messageInput = document.getElementById('messages-input').querySelector('input');
    const message = messageInput.value.trim();

    if (message) {
        const messageXML = `
            <message>
                <case>${chat_selected}</case>
                <sender>${user.username}</sender>
                <textmessage>${message}</textmessage>
                <time>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
            </message>`;
        webSocket.send(messageXML);
        messageInput.value = '';
    } 
    else {
        alert('El mensaje no puede estar vacío');
    }
}

// Añade manejadores de errores
webSocket.onerror = function(error) {
    console.error('Error en WebSocket:', error);
};

webSocket.onclose = function(event) {
    console.log('Conexión cerrada:', event);
    attemptReconnect(); // Intentar reconectar
};

// Selección de chat
document.querySelectorAll('.chat').forEach(chatElement => {
    chatElement.addEventListener('click', function() {
        chat_selected = this.getAttribute('data-chatname');
        // Actualizar la interfaz para mostrar el chat seleccionado
    });
});

// Conectar botón de enviar
document.querySelector('#messages-input button').addEventListener('click', sendMessage);
document.querySelector('#messages-input input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});

// Selección de chat
document.querySelectorAll('.chat').forEach(chatElement => {
    chatElement.addEventListener('click', function() {
        chat_selected = this.getAttribute('data-chatname'); // Cambia el valor de chat_selected
        console.log(`Chat seleccionado: ${chat_selected}`); // Opcional: para depuración

        // Actualizar el título del chat seleccionado
        document.getElementById('chat-info-tile').textContent = this.querySelector('.chat-name').textContent;

        // Actualizar la imagen del chat seleccionado
        const chatImageSrc = this.querySelector('img').getAttribute('src'); // Obtener la ruta de la imagen del chat
        document.querySelector('#chat-info img').setAttribute('src', chatImageSrc); // Cambiar la imagen en el contenedor
    });
});

window.addEventListener('beforeunload', function () {
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(`
            <message>
                <case>logout</case>
                <userId>${user.userid}</userId>
                <username>${user.username}</username>
            </message>`); // Envía un mensaje de cierre al servidor
        webSocket.close(); // Cierra la conexión WebSocket
        console.log('WebSocket cerrado antes de salir de la página.');
    }
});