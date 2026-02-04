require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const helmet = require('helmet');
const xss = require('xss');
const path = require('path');
const cors = require('cors');

const User = require('./models/User');
const Message = require('./models/Message');
const Activity = require('./models/Activity');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // In production, replace with your Vercel URL
        methods: ["GET", "POST"]
    }
});

app.use(cors());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dicochat')
    .then(() => console.log('MongoDB ulandi...'))
    .catch(err => console.error('MongoDB xatosi:', err));

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // For local development simplicity with sockets
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(express.static(path.join(__dirname, 'public')));

// Admin Middleware
const isAdmin = (req, res, next) => {
    if (req.session.admin) {
        next();
    } else {
        res.status(401).json({ error: 'Ruxsat berilmagan' });
    }
};

// Admin Routes
app.post('/api/admin-login', (req, res) => {
    const { code } = req.body;
    if (code === process.env.ADMIN_CODE) {
        req.session.admin = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Kod noto\'g\'ri' });
    }
});

app.get('/admin-dashboard', (req, res) => {
    if (req.session.admin) {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } else {
        res.redirect('/admin-login.html');
    }
});

// APIs for Admin
app.get('/api/admin/stats', isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const onlineUsers = await User.countDocuments({ isOnline: true });
        const recentActivities = await Activity.find().sort({ timestamp: -1 }).limit(20);
        const topUsers = await User.find().sort({ xp: -1 }).limit(10);

        res.json({ totalUsers, onlineUsers, recentActivities, topUsers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/action', isAdmin, async (req, res) => {
    const { action, nickname } = req.body;
    try {
        if (action === 'mute') {
            await User.findOneAndUpdate({ nickname }, { isMuted: true });
            io.emit('user_muted', nickname);
        } else if (action === 'unmute') {
            await User.findOneAndUpdate({ nickname }, { isMuted: false });
            io.emit('user_unmuted', nickname);
        } else if (action === 'kick') {
            const sockets = await io.fetchSockets();
            for (const s of sockets) {
                if (s.nickname === nickname) {
                    s.disconnect();
                }
            }
        } else if (action === 'resetXP') {
            await User.findOneAndUpdate({ nickname }, { xp: 0 });
            io.emit('xp_update', { nickname, xp: 0 });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/announce', isAdmin, async (req, res) => {
    const { message } = req.body;
    const msg = new Message({
        nickname: 'TIZIM',
        content: message,
        isSystem: true
    });
    await msg.save();
    io.emit('announcement', message);
    res.json({ success: true });
});

// Socket.io Logic
let onlineCount = 0;

io.on('connection', (socket) => {
    console.log('Yangi foydalanuvchi ulandi');

    socket.on('join', async (nickname) => {
        // Basic unique nickname check for online users
        const existingSockets = await io.fetchSockets();
        const isTaken = existingSockets.some(s => s.nickname === nickname);

        if (isTaken) {
            socket.emit('error_msg', 'Bu nik band. Iltimos boshqa tanlang.');
            return;
        }

        socket.nickname = nickname;

        let user = await User.findOne({ nickname });
        if (!user) {
            user = new User({ nickname });
        }
        user.isOnline = true;
        user.lastActive = new Date();
        await user.save();

        const activity = new Activity({ nickname, action: 'join' });
        await activity.save();

        onlineCount++;
        io.emit('update_online_count', onlineCount);

        // Send previous messages
        const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
        socket.emit('load_messages', messages.reverse());

        // Broadcast join
        socket.broadcast.emit('user_joined', nickname);

        // Send user's current XP
        socket.emit('init_xp', user.xp);

        // Update admin panel online list
        io.to('admin_room').emit('admin_user_list_update');
    });

    socket.on('send_message', async (content) => {
        if (!socket.nickname) return;

        const user = await User.findOne({ nickname: socket.nickname });
        if (!user) return;

        if (user.isMuted) {
            socket.emit('error_msg', 'Siz bloklangansiz (muted).');
            return;
        }

        // XP Spam check (2 seconds)
        const now = new Date();
        const timeDiff = (now - user.lastMessageAt) / 1000;
        let gainXP = false;

        if (timeDiff >= 2) {
            user.xp += 1;
            gainXP = true;
        }
        user.messageCount += 1;
        user.lastMessageAt = now;
        await user.save();

        const cleanContent = xss(content);
        const msg = new Message({
            nickname: socket.nickname,
            content: cleanContent
        });
        await msg.save();

        io.emit('new_message', {
            nickname: socket.nickname,
            content: cleanContent,
            xp: user.xp,
            gainXP
        });
    });

    socket.on('admin_join', () => {
        // In a real app, verify session here too
        socket.join('admin_room');
    });

    socket.on('disconnect', async () => {
        if (socket.nickname) {
            await User.findOneAndUpdate({ nickname: socket.nickname }, { isOnline: false, lastActive: new Date() });
            const activity = new Activity({ nickname: socket.nickname, action: 'leave' });
            await activity.save();

            onlineCount = Math.max(0, onlineCount - 1);
            io.emit('update_online_count', onlineCount);
            io.emit('user_left', socket.nickname);

            io.to('admin_room').emit('admin_user_list_update');
        }
        console.log('Foydalanuvchi uzildi');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} da ishlamoqda`);
});
