const mongoose = require('mongoose');

const calendarNoteSchema = new mongoose.Schema({
    date: {
        type: String,
        required: true
    },
    note: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('CalendarNote', calendarNoteSchema);
