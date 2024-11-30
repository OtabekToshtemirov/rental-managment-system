const express = require('express')
const router = express.Router()
const paymentController = require('../controllers/paymentController')

// Customer specific route (must come before /:id route)
router.get('/customer/:id', paymentController.getPaymentsByCustomerId)

// Basic CRUD operations
router.post('/', paymentController.createPayment)
router.get('/', paymentController.getAllPayments)
router.get('/:id', paymentController.getPaymentById)
router.put('/:id', paymentController.updatePayment)
router.delete('/:id', paymentController.deletePayment)

module.exports = router