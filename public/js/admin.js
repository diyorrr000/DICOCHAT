// Production backend URL (Render)
const BACKEND_URL = "https://dicochat.onrender.com"; // Updated with actual URL
const socket = io(window.location.hostname === 'localhost' ? '' : BACKEND_URL);

// Join admin room for real-time updates
socket.emit('admin_join');

const apiBase = window.location.hostname === 'localhost' ? '' : BACKEND_URL;

async function refreshStats() {
    const res = await fetch(`${apiBase}/api/admin/stats`);
    if (res.status === 401) {
        window.location.href = '/admin-login.html';
        return;
    }
    const data = await res.json();

    document.getElementById('total-users-count').textContent = data.totalUsers;
    document.getElementById('online-users-count').textContent = data.onlineUsers;

    // Refresh Top Users Table
    const tbody = document.querySelector('#top-users-table tbody');
    tbody.innerHTML = '';
    data.topUsers.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.nickname} ${user.isOnline ? '<span style="color:#10b981">●</span>' : ''}</td>
            <td>${user.xp}</td>
            <td>${user.messageCount}</td>
            <td>
                <button class="btn-small btn-warning" onclick="adminAction('mute', '${user.nickname}')">${user.isMuted ? 'Muted' : 'Mute'}</button>
                <button class="btn-small btn-danger" onclick="adminAction('resetXP', '${user.nickname}')">Reset XP</button>
                <button class="btn-small btn-danger" onclick="adminAction('kick', '${user.nickname}')">Kick</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Refresh Activity Log
    const logDiv = document.getElementById('activity-log');
    logDiv.innerHTML = '';
    data.recentActivities.forEach(act => {
        const p = document.createElement('p');
        p.style.marginBottom = '5px';
        p.style.borderBottom = '1px solid #334155';
        const date = new Date(act.timestamp).toLocaleTimeString();
        p.innerHTML = `<span style="color:var(--text-muted)">[${date}]</span> <strong>${act.nickname}</strong> ${act.action === 'join' ? 'kirdi' : 'chiqdi'}`;
        logDiv.appendChild(p);
    });
}

async function adminAction(action, nickname) {
    if (!confirm(`Haqiqatan ham "${nickname}" ustidan "${action}" amalini bajarmoqchimisiz?`)) return;

    await fetch(`${apiBase}/api/admin/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, nickname })
    });
    refreshStats();
}

async function sendAnnounce() {
    const message = document.getElementById('announce-text').value;
    if (!message) return;

    await fetch(`${apiBase}/api/admin/announce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    });
    document.getElementById('announce-text').value = '';
    alert('E\'lon yuborildi!');
}

// Socket updates for admin
socket.on('admin_user_list_update', () => {
    refreshStats();
});

// Initial load
refreshStats();
// Periodic refresh every 30 seconds as fallback
setInterval(refreshStats, 30000);
