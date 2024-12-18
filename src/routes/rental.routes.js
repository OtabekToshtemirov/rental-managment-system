const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rentalController');

// Filter routes
router.get('/active', rentalController.getActiveRentals);
router.get('/complete', rentalController.getCompleteRentals);
router.get('/customer/:customerId', rentalController.getRentalsByCustomerId);
router.get('/car/:carId', rentalController.getRentalsByCarId);

// Basic CRUD operations
router.post('/', rentalController.createRental);
router.get('/', rentalController.getAllRentals);
router.get('/:id', rentalController.getRentalById);
router.put('/:id', rentalController.editRental);
router.delete('/:id', rentalController.deleteRental);

// Product return
router.post('/return', rentalController.returnProduct);

module.exports = router;
