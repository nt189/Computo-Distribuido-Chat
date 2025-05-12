import asyncio
import websockets
from xml.etree import ElementTree as ET
import Pyro4
import json

# Diccionario de clientes (userId: {username, status, websocket})
clients = {}

def save_clients():
    serializable_clients = {
        user_id: {
            "username": data["username"],
            "status": data["status"]
            # No guardamos el websocket porque no es serializable
        } for user_id, data in clients.items()
    }

    with open("clients.json", "w") as f:
        json.dump(serializable_clients, f)
    
def load_clients():
    try:
        with open("clients.json", "r") as f:
            data = json.load(f)
            for user_id, info in data.items():
                clients[user_id] = {
                    "username": info["username"],
                    "status": info["status"],
                    "websocket": None  # Se actualizará cuando el usuario se conecte
                }
    except FileNotFoundError:
        print("Archivo clients.json no encontrado, se iniciará una lista vacía.")

chat_services = Pyro4.Proxy("PYRONAME:chat.service")

async def login(xmlRecived, websocket):
    userid = xmlRecived.find("userid").text
    username = xmlRecived.find("username").text

    if userid in clients:
        clients[userid]["status"] = "activo"
        clients[userid]["websocket"] = websocket
    else:
        username = "desconocido"

    return f'''
        <response>
            <case>login</case>
            <userid>{userid}</userid>
            <username>{username}</username>
            <status>ok</status>
        </response>
    '''

async def register(xmlRecived, websocket):
    username = xmlRecived.find("username").text
    user_id = 'user' + str(len(clients))

    if user_id not in clients:
        clients[user_id] = {
            "username": username,
            "status": "activo",
            "websocket": websocket
        }
        save_clients()

    return f'''
        <response>
            <case>login</case>
            <userid>{user_id}</userid>
            <username>{username}</username>
            <status>ok</status>
        </response>
    '''

async def logout(xmlRecived):
    userid = xmlRecived.find("userId").text
    if userid in clients:
        clients[userid]["status"] = "inactivo"
        clients[userid]["websocket"] = None
    return '<response><case>logout</case><status>ok</status></response>'

async def globalChat(xmlReceived):
    # Convertir el objeto XML a una cadena de texto
    xml_string = ET.tostring(xmlReceived, encoding='utf-8', method='xml').decode('utf-8')
    
    # Llamar al servicio Pyro4 con la cadena XML
    response = chat_services.globalChat(xml_string)

    for client in clients.values():
        if client["websocket"] is not None:
            try:
                await client["websocket"].send(response)
            except websockets.ConnectionClosed:
                client["status"] = "inactivo"
                client["websocket"] = None
                
# -----------------------------------------------------------------------------------------

async def handler(websocket):
    try:
        async for message in websocket:
            try:
                xml = ET.fromstring(message)
                case = xml.find("case").text

                if case == "login":
                    response = await login(xml, websocket)
                elif case == "register":
                    response = await register(xml, websocket)
                elif case == "logout":
                    response = await logout(xml)
                elif case == "global-chat":
                    await globalChat(xml)
                else:
                    response = '<response><case>error</case><message>Caso no reconocido</message></response>'

                await websocket.send(response)

            except ET.ParseError:
                error = '<response><case>error</case><message>XML inválido</message></response>'
                await websocket.send(error)
                
    except websockets.ConnectionClosed:
        print("Cliente desconectado")

async def main():
    async with websockets.serve(handler, "192.168.1.68", 8888):
        print("Servidor WebSocket iniciado en ws://192.168.1.68:8888")
        await asyncio.Future()

if __name__ == "__main__":
    load_clients()
    asyncio.run(main())
