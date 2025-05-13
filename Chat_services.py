import Pyro4
import xml.etree.ElementTree as ET

@Pyro4.expose
class ChatServices:
    def otherMessage(self, xmlRecived):
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
    
    def myMessage(self, xmlRecived):
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
                    &lt;div class=&quot;message-container my-messages&quot;&gt;
                        &lt;div class=&quot;message-content&quot;&gt;
                            &lt;span&gt;{message}&lt;/span&gt;
                            &lt;span class=&quot;message-time&quot;&gt;{time}&lt;/span&gt;
                        &lt;/div&gt;
                    &lt;/div&gt;
                </htmlmessage>
            </response>
            '''

        return template
    def createchat(self, xmlRecived):
        xmlRecived = ET.fromstring(xmlRecived)
        sender = xmlRecived.find("sender").text
        message = xmlRecived.find("textmessage").text
        time = xmlRecived.find("time").text
        case = xmlRecived.find("case").text
        
        template = f'''
            <response>
                <case>message</case>
                <for>{case}</for>
                <htmlnewchat>
                    &lt;div class="chat" data-chatname="private-chat"&gt;
                        &lt;img src="img/avatardefault.png" alt="Avatar"&gt;
                        &lt;div class="chat-preview"&gt;
                            &lt;div class="chat-header"&gt;
                                &lt;span class="chat-name"&gt;{sender}&lt;/span&gt;
                                &lt;span class="chat-time" id="{sender}-last-time"&gt;{time}&lt;/span&gt;
                            &lt;/div&gt;
                            &lt;p class="chat-message" id="user1-premessage"&gt;{message[:12]+'...'}&lt;/p&gt;
                        &lt;/div&gt;
                    &lt;/div&gt;
                </htmlnewchat>
        '''

        return template

# Registrar el servicio
daemon = Pyro4.Daemon()
ns = Pyro4.locateNS()
uri = daemon.register(ChatServices)
ns.register("chat.service", uri)

print("Servidor Pyro4 corriendo...")
daemon.requestLoop()