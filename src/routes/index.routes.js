const express = require('express')
const router = express.Router()

const customerRoutes = require('./customer.routes')
const productRoutes = require('./product.routes')
const rentalRoutes = require('./rental.routes')
const paymentRoutes = require('./payment.routes')
const statisticsRoutes = require('./statistics.routes')

router.use('/customers', customerRoutes)
router.use('/products', productRoutes)
router.use('/rentals', rentalRoutes)
router.use('/payments', paymentRoutes)
router.use('/statistics', statisticsRoutes)

module.exports = router