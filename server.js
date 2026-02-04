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
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Database connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Global bazaga ulandi!'))
    .catch(err => console.error('MongoDB ulanishda xato:', err));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'dicochat_secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Admin Middleware
const isAdmin = (req, res, next) => {
    if (req.session.admin) next();
    else res.status(401).json({ error: 'Ruxsat berilmagan' });
};

// Admin Routes
app.post('/api/admin-login', (req, res) => {
    if (req.body.code === process.env.ADMIN_CODE) {
        req.session.admin = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Kod noto\'g\'ri' });
    }
});

app.get('/admin-dashboard', (req, res) => {
    if (req.session.admin) res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    else res.redirect('/admin-login.html');
});

app.get('/api/admin/stats', isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const onlineUsers = await User.countDocuments({ isOnline: true });
        const recentActivities = await Activity.find().sort({ timestamp: -1 }).limit(20);
        const topUsers = await User.find().sort({ xp: -1 }).limit(10);
        res.json({ totalUsers, onlineUsers, recentActivities, topUsers });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/action', isAdmin, async (req, res) => {
    const { action, nickname } = req.body;
    try {
        if (action === 'mute') await User.findOneAndUpdate({ nickname }, { isMuted: true });
        else if (action === 'unmute') await User.findOneAndUpdate({ nickname }, { isMuted: false });
        else if (action === 'resetXP') await User.findOneAndUpdate({ nickname }, { xp: 0 });
        io.emit('admin_user_list_update');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Socket.io Logic
let onlineCount = 0;

io.on('connection', (socket) => {
    socket.on('join', async (nickname) => {
        let user = await User.findOne({ nickname });
        if (user && user.isOnline) {
            socket.emit('error_msg', 'Bu nik hozir onlayn. Boshqa tanlang.');
            return;
        }

        socket.nickname = nickname;
        if (!user) {
            user = new User({ nickname });
        }
        user.isOnline = true;
        await user.save();

        await new Activity({ nickname, action: 'join' }).save();

        onlineCount++;
        io.emit('update_online_count', onlineCount);
        const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
        socket.emit('load_messages', messages.reverse());
        socket.broadcast.emit('user_joined', nickname);
        socket.emit('init_xp', user.xp);
        io.to('admin_room').emit('admin_user_list_update');
    });

    socket.on('send_message', async (content) => {
        if (!socket.nickname) return;
        const user = await User.findOne({ nickname: socket.nickname });
        if (!user || user.isMuted) return;

        const now = new Date();
        if ((now - (user.lastMessageAt || 0)) / 1000 >= 2) {
            user.xp += 1;
        }
        user.messageCount += 1;
        user.lastMessageAt = now;
        await user.save();

        const cleanContent = xss(content);
        const msg = new Message({ nickname: socket.nickname, content: cleanContent });
        await msg.save();

        io.emit('new_message', { nickname: socket.nickname, content: cleanContent, xp: user.xp });
    });

    socket.on('admin_join', () => socket.join('admin_room'));

    socket.on('disconnect', async () => {
        if (socket.nickname) {
            await User.findOneAndUpdate({ nickname: socket.nickname }, { isOnline: false });
            await new Activity({ nickname: socket.nickname, action: 'leave' }).save();
            onlineCount = Math.max(0, onlineCount - 1);
            io.emit('update_online_count', onlineCount);
            io.emit('user_left', socket.nickname);
            io.to('admin_room').emit('admin_user_list_update');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));
