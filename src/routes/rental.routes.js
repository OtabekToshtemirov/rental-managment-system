const express = require('express')
const router = express.Router()
const rentalController = require('../controllers/rentalController')

// Filter routes (must come before /:id routes to avoid conflicts)
router.get('/active', rentalController.getActiveRentals)
router.get('/completed', rentalController.getCompletedRentals)
router.get('/customer/:customerId', rentalController.getRentalsByCustomerId)

// Product management routes
router.post('/:rentalId/return', rentalController.addReturnedProduct) 
router.post('/:rentalId/borrow', rentalController.addBorrowedProduct)

// Basic CRUD operations
router.post('/', rentalController.createRental)
router.get('/', rentalController.getAllRentals)
router.get('/:id', rentalController.getRentalById)
router.put('/:id', rentalController.updateRental)
router.delete('/:id', rentalController.deleteRental)

module.exports = router
