import asyncio
import websockets
from xml.etree import ElementTree as ET
import logging
import Pyro4

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("websockets")
logger.setLevel(logging.INFO)

# Almacenar conexiones activas (websocket: username)
connected_clients = {}

async def handler(websocket):
    try:
        # Primer mensaje es el nombre de usuario
        username = await websocket.recv()
        connected_clients[websocket] = username
        logger.info(f"Usuario conectado: {username}")

        # Manejar mensajes subsiguientes
        async for message in websocket:
            logger.info(f"Mensaje de {username}: {message}")
            
            # Crear XML para el mensaje
            msg_xml = ET.Element("message")
            ET.SubElement(msg_xml, "username").text = username
            ET.SubElement(msg_xml, "content").text = message
            xml_str = ET.tostring(msg_xml, encoding="unicode")
            
            # Reenviar mensaje a todos menos al remitente
            for client in connected_clients:
                if client != websocket:
                    await client.send(xml_str)
                    
    except websockets.exceptions.ConnectionClosedError:
        logger.info(f"Usuario desconectado: {connected_clients.get(websocket, 'unknown')}")
    finally:
        # Limpiar al desconectar
        if websocket in connected_clients:
            del connected_clients[websocket]

async def main():
    async with websockets.serve(handler, "localhost", 12345):
        logger.info("Servidor WebSocket escuchando en ws://localhost:12345")
        await asyncio.Future()  # Ejecutar indefinidamente

if __name__ == "__main__":
    asyncio.run(main())