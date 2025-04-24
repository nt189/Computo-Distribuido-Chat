const divs = document.getElementsByClassName('chat');

for (let i = 0; i < divs.length; i++) {
    divs[i].addEventListener('click', function() {
        const namechat = divs[i].getAttribute('data-chatname');
        document.getElementById('messages-content').innerHTML = '';
    });
}
