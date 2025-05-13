import asyncio
import websockets
from xml.etree import ElementTree as ET
import Pyro4
import json

# Diccionario de clientes (userId: {username, status, websocket})
clients = {}

async def broadcastUserList():
    response = '''
        <response>
            <case>updateUsers</case>
            {}
            {}
        </response>
    '''.format(
        ''.join(f'<connectedUser name="{user["username"]}" chatname="{user_id}" avatar="img/avatardefault.png" />'
                for user_id, user in clients.items() if user["status"] == "Activo"),
        ''.join(f'<disconnectedUser name="{user["username"]}" chatname="{user_id}" avatar="img/avatardefault.png" />'
                for user_id, user in clients.items() if user["status"] == "Inactivo")
    )

    for client in clients.values():
        if client["websocket"] is not None:
            try:
                await client["websocket"].send(response)
            except websockets.ConnectionClosed:
                client["status"] = "Inactivo"
                client["websocket"] = None

def save_clients():
    serializable_clients = {
        user_id: {
            "username": data["username"],
            "status": "Inactivo"
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
        clients[userid]["status"] = "Activo"
        clients[userid]["websocket"] = websocket
    else:
        username = "desconocido"

    await broadcastUserList()

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
            "status": "Activo",
            "websocket": websocket
        }
        save_clients()

    await broadcastUserList()

    return f'''
        <response>
            <case>login</case>
            <userid>{user_id}</userid>
            <username>{username}</username>
            <status>ok</status>
        </response>
    '''

async def logout(xmlRecived):
    user_id_element = xmlRecived.find("userId")
    if user_id_element is None:
        print("Error: No se encontró el elemento <userId> en el XML recibido.")
        return '<response><case>error</case><message>Elemento <userId> no encontrado</message></response>'

    userid = user_id_element.text
    if userid in clients.keys():
        clients[userid]["status"] = "Inactivo"
        clients[userid]["websocket"] = None
        save_clients()  # Guarda el estado actualizado
        await broadcastUserList()  # Notificar a los demás clientes

    return '<response><case>logout</case><status>ok</status></response>'

async def globalChat(xmlReceived):  # broadcast
    xml_string = ET.tostring(xmlReceived, encoding='utf-8', method='xml').decode('utf-8')
    
    # Llamar al servicio Pyro4 con la cadena XML
    response = chat_services.otherMessage(xml_string)
    response1 = chat_services.myMessage(xml_string)

    for client in clients.values():
        if client["websocket"] is not None:  
            try:
                if client['username'] != xmlReceived.find("sender").text:
                    await client["websocket"].send(response)
                else:
                    await client["websocket"].send(response1)
            except websockets.ConnectionClosed:
                client["status"] = "Inactivo"
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
        # Manejar la desconexión del cliente
        for user_id, client in clients.items():
            if client["websocket"] == websocket:
                print(f"Cliente {client['username']} desconectado")
                client["status"] = "Inactivo"
                client["websocket"] = None
                await broadcastUserList()  # Notificar a los demás clientes
                break

async def main():
    async with websockets.serve(handler, "192.168.1.68", 8888, ping_timeout=20):
        print("Servidor WebSocket iniciado en ws://192.168.1.68:8888")
        await asyncio.Future()

if __name__ == "__main__":
    load_clients()
    asyncio.run(main())
