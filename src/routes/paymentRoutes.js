const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Create a new payment
router.post('/', paymentController.createPayment);

// Get all payments
router.get('/', paymentController.getAllPayments);

// Get payments by customer
router.get('/customer/:customerId', paymentController.getPaymentsByCustomerId);

// Get a payment by ID
router.get('/:id', paymentController.getPaymentById);

// Update a payment
router.put('/:id', paymentController.updatePayment);

// Delete a payment
router.delete('/:id', paymentController.deletePayment);

// Get daily payment statistics
router.get('/stats/daily', paymentController.getDailyPaymentStats);

module.exports = router;
