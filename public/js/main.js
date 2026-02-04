// Production backend URL (Render)
const BACKEND_URL = "https://dicochat-backend.onrender.com"; // Replace after deployment
const socket = io(window.location.hostname === 'localhost' ? '' : BACKEND_URL);

const nickname = localStorage.getItem('dico_nickname');
if (!nickname) {
    window.location.href = 'index.html';
}

const messagesContainer = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const msgInput = document.getElementById('msg-input');
const onlineList = document.getElementById('online-list');
const onlineCount = document.getElementById('online-count');
const myNickDisplay = document.getElementById('my-nick');
const myXPBadge = document.getElementById('my-xp-badge');

let myXP = 0;

myNickDisplay.textContent = nickname;

// Join the chat
socket.emit('join', nickname);

socket.on('error_msg', (msg) => {
    window.location.href = `index.html?error=${encodeURIComponent(msg)}`;
});

socket.on('init_xp', (xp) => {
    myXP = xp;
    myXPBadge.textContent = `${myXP} XP`;
});

socket.on('load_messages', (messages) => {
    messages.forEach(msg => {
        appendMessage(msg, false);
    });
    scrollToBottom();
});

socket.on('new_message', (data) => {
    appendMessage(data, true);
    if (data.nickname === nickname) {
        myXP = data.xp;
        myXPBadge.textContent = `${myXP} XP`;
    }
    scrollToBottom();
});

socket.on('announcement', (text) => {
    const div = document.createElement('div');
    div.className = 'message system';
    div.innerHTML = `<strong>[E'LON]:</strong> ${text}`;
    messagesContainer.appendChild(div);
    scrollToBottom();
});

socket.on('user_joined', (nick) => {
    const div = document.createElement('div');
    div.className = 'message system';
    div.textContent = `${nick} chatga qo'shildi`;
    messagesContainer.appendChild(div);
    scrollToBottom();
});

socket.on('user_left', (nick) => {
    const div = document.createElement('div');
    div.className = 'message system';
    div.textContent = `${nick} chatni tark etdi`;
    messagesContainer.appendChild(div);
    scrollToBottom();
});

socket.on('update_online_count', (count) => {
    onlineCount.textContent = count;
});

socket.on('user_muted', (nick) => {
    if (nick === nickname) {
        alert('Siz bloklandingiz (muted). Xabar yubora olmaysiz.');
    }
});

socket.on('xp_update', (data) => {
    if (data.nickname === nickname) {
        myXP = data.xp;
        myXPBadge.textContent = `${myXP} XP`;
    }
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const content = msgInput.value.trim();
    if (content) {
        socket.emit('send_message', content);
        msgInput.value = '';
    }
});

function appendMessage(data, animate) {
    const div = document.createElement('div');
    if (data.isSystem) {
        div.className = 'message system';
        div.innerHTML = `<strong>[TIZIM]:</strong> ${data.content}`;
    } else {
        const isMe = data.nickname === nickname;
        div.className = `message ${isMe ? 'me' : 'other'}`;

        div.innerHTML = `
            <div class="msg-header">
                <span class="msg-nick">${data.nickname}</span>
                <span class="msg-xp">${data.xp || 0} XP</span>
            </div>
            <div class="msg-content">${data.content}</div>
        `;
    }
    messagesContainer.appendChild(div);
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
