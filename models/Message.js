const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    nickname: { type: String, required: true },
    content: { type: String, required: true },
    isSystem: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);
