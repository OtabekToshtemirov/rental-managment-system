const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rentalController');

// Get today's statistics
router.get('/statistics/today', rentalController.getTodayStatistics);

// Other routes...
router.get('/', rentalController.getAllRentals);
router.get('/:id', rentalController.getRentalById);
router.post('/', rentalController.createRental);
router.put('/:id', rentalController.updateRental);
router.delete('/:id', rentalController.deleteRental);
router.post('/return/:id', rentalController.returnRental);

module.exports = router;
