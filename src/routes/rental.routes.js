const express = require('express')
const router = express.Router()
const rentalController = require('../controllers/rentalController')

// Middleware to validate ObjectId
const validateObjectId = (req, res, next) => {
    const id = req.params.id;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: 'Invalid ID format' });
    }
    next();
};

// Filter routes (must come before /:id routes to avoid conflicts)
router.get('/active', rentalController.getActiveRentals)
router.get('/completed', rentalController.getCompletedRentals)
router.get('/customer/:id', validateObjectId, rentalController.getRentalsByCustomerId)
router.get('/product/:id', validateObjectId, rentalController.getRentalsByProductId)

// Product management routes
router.post('/return', rentalController.addReturnedProduct) 
router.post('/borrow', rentalController.addBorrowedProduct)

// Basic CRUD operations
router.post('/', rentalController.createRental)
router.get('/', rentalController.getAllRentals)
router.get('/:id', validateObjectId, rentalController.getRentalById)
router.put('/:id', validateObjectId, rentalController.updateRental)
router.delete('/:id', validateObjectId, rentalController.deleteRental)

module.exports = router
