const express = require('express')
const router = express.Router()

const customerRoutes = require('./customer.routes')
const productRoutes = require('./product.routes')
const rentalRoutes = require('./rental.routes')

router.use('/api/customers', customerRoutes)
router.use('/api/products', productRoutes)
router.use('/api/rentals', rentalRoutes)

module.exports = router
