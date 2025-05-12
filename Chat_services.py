import Pyro4
import xml.etree.ElementTree as ET

@Pyro4.expose
class ChatServices:
    def globalChat(self, xmlRecived):
        xmlRecived = ET.fromstring(xmlRecived)
        sender = xmlRecived.find("sender").text
        message = xmlRecived.find("textmessage").text
        time = xmlRecived.find("time").text
        case = xmlRecived.find("case").text

        template = f''' 
            <response>
                <case>message</case>
                <for>{case}</for>
                <htmlmessage>
                    &lt;div class=&quot;message-container other-messages&quot;&gt;
                        &lt;div class=&quot;sender-name&quot;&gt;{sender}&lt;/div&gt;
                        &lt;div class=&quot;message-content&quot;&gt;
                            &lt;span&gt;{message}&lt;/span&gt;
                            &lt;span class=&quot;message-time&quot;&gt;{time}&lt;/span&gt;
                        &lt;/div&gt;
                    &lt;/div&gt;
                </htmlmessage>
            </response>
            '''

        return template

# Registrar el servicio
daemon = Pyro4.Daemon()
ns = Pyro4.locateNS()
uri = daemon.register(ChatServices)
ns.register("chat.service", uri)

print("Servidor Pyro4 corriendo...")
daemon.requestLoop()