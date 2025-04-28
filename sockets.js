let socket;
let username = prompt("Ingresa tu nombre de usuario:") || "Anónimo";

// Conectar al servidor
function connectToServer() {
    socket = new WebSocket('ws://localhost:12345');

    socket.onopen = function() {
        console.log('Conectado al servidor.');
        socket.send(username);
    };

    socket.onmessage = function(event) {
        let messagesContent = document.getElementById('messages-content');
    
        // Parsear el mensaje como XML
        let parser = new DOMParser();
        let xmlDoc;
        
        try {
            xmlDoc = parser.parseFromString(event.data, "text/xml");
            
            // Verificar si es un mensaje de chat
            if (xmlDoc.getElementsByTagName("message").length > 0) {
                // Obtener el nombre y el contenido del mensaje
                let sender = xmlDoc.getElementsByTagName("username")[0].childNodes[0].nodeValue;
                let content = xmlDoc.getElementsByTagName("content")[0].childNodes[0].nodeValue;
                
                // Solo mostrar mensajes de otros usuarios
                if (sender !== username) {
                    let messageElement = document.createElement('div');
                    messageElement.classList.add('message-container', 'other-messages');
                    
                    messageElement.innerHTML = `
                        <div class="sender-name">${sender}</div>
                        <div class="message-content">
                            <span>${content}</span>
                            <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    `;
                    
                    messagesContent.appendChild(messageElement);
                    messagesContent.scrollTop = messagesContent.scrollHeight;
                }
            }
        } catch (error) {
            console.error("Error al parsear mensaje:", error);
        }
    };
    
    socket.onclose = function() {
        console.log('Desconectado del servidor.');
    };
    
    socket.onerror = function(error) {
        console.error('Error en la conexión:', error);
    };
}

// Enviar mensaje
function sendMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
    }
}

// Manejar envío de mensajes
document.addEventListener('DOMContentLoaded', () => {
    connectToServer();

    const sendButton = document.querySelector('#messages-input button');
    const inputField = document.querySelector('#messages-input input');

    function handleSendMessage() {
        const message = inputField.value.trim();
        if (message !== '' && socket.readyState === WebSocket.OPEN) {
            sendMessage(message);

            // Mostrar el mensaje propio en la pantalla
            const messagesContent = document.getElementById('messages-content');
            const messageElement = document.createElement('div');
            messageElement.classList.add('message-container', 'my-messages');
            messageElement.innerHTML = `
                <div class="message-content">
                    <span>${message}</span>
                    <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            `;
            messagesContent.appendChild(messageElement);
            messagesContent.scrollTop = messagesContent.scrollHeight;

            inputField.value = '';
        }
    }

    // Enviar al hacer click
    sendButton.addEventListener('click', handleSendMessage);
    
    // Enviar al presionar Enter
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });
});