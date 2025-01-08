const express = require('express');
const router = express.Router();
const { getNotes, upsertNote, deleteNote } = require('../controllers/calendarNoteController');

router.get('/', getNotes);
router.post('/', upsertNote);
router.delete('/:date', deleteNote);

module.exports = router;
