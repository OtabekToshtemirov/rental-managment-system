const CalendarNote = require('../models/calendarNote');

// Get all notes
const getNotes = async (req, res) => {
    try {
        const notes = await CalendarNote.find();
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create or update a note
const upsertNote = async (req, res) => {
    const { date, note, color } = req.body;

    try {
        const existingNote = await CalendarNote.findOne({ date });
        
        if (existingNote) {
            // Update existing note
            existingNote.note = note;
            existingNote.color = color;
            await existingNote.save();
            res.json(existingNote);
        } else {
            // Create new note
            const newNote = new CalendarNote({
                date,
                note,
                color
            });
            const savedNote = await newNote.save();
            res.status(201).json(savedNote);
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a note
const deleteNote = async (req, res) => {
    const { date } = req.params;
    
    try {
        await CalendarNote.findOneAndDelete({ date });
        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getNotes,
    upsertNote,
    deleteNote
};
