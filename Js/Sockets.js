const webSocket = new WebSocket('ws://192.168.1.68:8888');
let user = {};
let chat_selected = 'global-chat';

// Cuando el WebSocket se abre 
webSocket.onopen = function (event) {
    console.log('WebSocket conectado');

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
            } 
            else {
                alert('El nombre de usuario no puede estar vacío');
                username = null;
            }
        }
    }
};

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
    // Opcional: intentar reconectar
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