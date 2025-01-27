const mongoose = require('mongoose');

const LoginAttemptSchema = new mongoose.Schema({
    ip: { 
        type: String 
    },
    mobile: { 
        type: String 
    },
    reason: { 
        type: String 
    },
    lastAttemptAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('LoginAttempt', LoginAttemptSchema);
