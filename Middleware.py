from websocket_server import WebsocketServer
from xml.etree import ElementTree as ET
import Pyro4
import json

#----------------------------- Conexion con objetos remotos Pyro4 -------------------------
chat_services = Pyro4.Proxy("PYRONAME:chat.service")

if chat_services.conection():
    print("conexion establecida con los objetos remotos")
else:
    print("No se pudo establecer una conexion con los objetos remotos")

# Diccionario de clientes (userId: {username, status, handler})
clients = {}

def broadcastUserList(server):
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
        if client["handler"] is not None:
            try:
                server.send_message(client["handler"], response)
            except Exception:
                client["status"] = "Inactivo"
                client["handler"] = None

def save_clients():
    serializable_clients = {
        user_id: {
            "username": data["username"],
            "status": "Inactivo"
        } for user_id, data in clients.items()
    }

    with open("clients.json", "w") as f:
        json.dump(serializable_clients, f)
    
def load_clients():
    try:
        with open("clients.json", "r") as f:
            data = json.load(f)
            if not data:
                print("El archivo clients.json está vacío, se iniciará una lista vacía.")
                return
            for user_id, info in data.items():
                clients[user_id] = {
                    "username": info["username"],
                    "status": info["status"],
                    "handler": None  # Se actualizará cuando el usuario se conecte
                }
    except FileNotFoundError:
        print("Archivo clients.json no encontrado, se iniciará una lista vacía.")
    except json.JSONDecodeError:
        print("El archivo clients.json no contiene datos válidos, se iniciará una lista vacía.")

def login(xmlRecived, handler, server):
    userid = xmlRecived.find("userid").text
    username = xmlRecived.find("username").text

    if userid in clients:
        clients[userid]["status"] = "Activo"
        clients[userid]["handler"] = handler
    else:
        username = "desconocido"

    broadcastUserList(server)

    return f'''
        <response>
            <case>login</case>
            <userid>{userid}</userid>
            <username>{username}</username>
            <status>ok</status>
        </response>
    '''

def register(xmlRecived, handler, server):
    username = xmlRecived.find("username").text
    user_id = 'user' + str(len(clients))

    if user_id not in clients:
        clients[user_id] = {
            "username": username,
            "status": "Activo",
            "handler": handler
        }
        save_clients()

    broadcastUserList(server)

    return f'''
        <response>
            <case>login</case>
            <userid>{user_id}</userid>
            <username>{username}</username>
            <status>ok</status>
        </response>
    '''

def logout(xmlRecived, handler, server):
    user_id_element = xmlRecived.find("userId")
    if user_id_element is None:
        print("Error: No se encontró el elemento <userId> en el XML recibido.")
        return '<response><case>error</case><message>Elemento <userId> no encontrado</message></response>'

    userid = user_id_element.text
    if userid in clients.keys():
        clients[userid]["status"] = "Inactivo"
        clients[userid]["handler"] = None
        save_clients()
        broadcastUserList(server)

    return '<response><case>logout</case><status>ok</status></response>'

def broadcast(xmlReceived, handler, server):
    xml_string = ET.tostring(xmlReceived, encoding='utf-8', method='xml').decode('utf-8')
    response = chat_services.otherMessage(xml_string)
    response1 = chat_services.myMessage(xml_string)
    sender = xmlReceived.find("sender").text

    for client in clients.values():
        if client["handler"] is not None:
            try:
                if client['username'] != sender:
                    server.send_message(client["handler"], response)
                else:
                    server.send_message(client["handler"], response1)
            except Exception:
                client["status"] = "Inactivo"
                client["handler"] = None

def multicast(xmlReceived, handler, server):
    xml_string = ET.tostring(xmlReceived, encoding='utf-8', method='xml').decode('utf-8')
    addressees = xmlReceived.find("addressee").text
    addressees = [a.strip() for a in addressees.split(',') if a.strip()]
    response = chat_services.otherMessage(xml_string)
    response1 = chat_services.myMessage(xml_string)
    sender = xmlReceived.find("sender").text

    for user_id in addressees:
        client = clients.get(user_id)
        if client and client["handler"] is not None:
            try:
                if client['username'] != sender:
                    server.send_message(client["handler"], response)
                else:
                    server.send_message(client["handler"], response1)
            except Exception:
                client["status"] = "Inactivo"
                client["handler"] = None

def unicast(xmlReceived, handler, server):
    xml_string = ET.tostring(xmlReceived, encoding='utf-8', method='xml').decode('utf-8')
    addressee = xmlReceived.find("addressee").text
    response = chat_services.otherMessage(xml_string)
    client = clients.get(addressee)
    if client and client["handler"] is not None:
        try:
            server.send_message(client["handler"], response)
        except Exception:
            client["status"] = "Inactivo"
            client["handler"] = None

def message_received(client, server, message):
    try:
        xml = ET.fromstring(message)
        case = xml.find("case").text

        if case == "login":
            response = login(xml, client, server)
            server.send_message(client, response)
        elif case == "register":
            response = register(xml, client, server)
            server.send_message(client, response)
        elif case == "logout":
            response = logout(xml, client, server)
            server.send_message(client, response)
        elif case == "broadcast":
            broadcast(xml, client, server)
        elif case == "multicast":
            multicast(xml, client, server)
        elif case == "unicast":
            unicast(xml, client, server)
        else:
            response = '<response><case>error</case><message>Caso no reconocido</message></response>'
            server.send_message(client, response)
    except ET.ParseError:
        error = '<response><case>error</case><message>XML inválido</message></response>'
        server.send_message(client, error)

def client_left(client, server):
    for user_id, c in clients.items():
        if c["handler"] == client:
            print(f"Cliente {c['username']} desconectado")
            c["status"] = "Inactivo"
            c["handler"] = None
            broadcastUserList(server)
            break

if __name__ == "__main__":
    load_clients()
    server = WebsocketServer(host='192.168.1.68', port=8888)
    server.set_fn_message_received(message_received)
    server.set_fn_client_left(client_left)
    print("Servidor WebSocket sincrónico iniciado en ws://192.168.1.68:8888")
    server.run_forever()