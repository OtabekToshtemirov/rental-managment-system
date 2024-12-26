const express = require('express')
const router = express.Router()
const customerController = require('../controllers/customerController')

// Basic CRUD operations
router.post('/', customerController.createCustomer)
router.get('/', customerController.getAllCustomers)
router.get('/:id', customerController.getCustomerById)
router.put('/:id', customerController.updateCustomer)
router.delete('/:id', customerController.deleteCustomer)

// Filter routes
router.get('/filter/status', customerController.getCustomersByStatus)

module.exports = router
