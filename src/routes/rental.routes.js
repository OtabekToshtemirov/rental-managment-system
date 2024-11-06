const express = require('express')
const router = express.Router()
const rentalController = require('../controllers/rentalController')

router.post('/', rentalController.createRental)
router.get('/', rentalController.getAllRentals)
router.get('/:id', rentalController.getRentalById)
router.put('/:id', rentalController.updateRental)
router.delete('/:id', rentalController.deleteRental)

module.exports = router
