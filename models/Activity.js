const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
    nickname: { type: String, required: true },
    action: { type: String, enum: ['join', 'leave'], required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', ActivitySchema);
