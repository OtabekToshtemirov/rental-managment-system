const express = require('express')
const router = express.Router()
const rentalController = require('../controllers/rentalController')

router.post('/', rentalController.createRental)
router.get('/', rentalController.getAllRentals)
router.get('/:id', rentalController.getRentalById)
router.put('/:id', rentalController.updateRental)
router.delete('/:id', rentalController.deleteRental)
router.get('/customer/:id', rentalController.getRentalsByCustomerId)
router.get('/product/:id', rentalController.getRentalsByProductId)

module.exports = router
