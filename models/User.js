const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    nickname: { type: String, required: true, unique: true },
    xp: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now },
    isMuted: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
