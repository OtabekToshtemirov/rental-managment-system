const express = require('express')
const router = express.Router()

const customerRoutes = require('./customer.routes')
const productRoutes = require('./product.routes')
const rentalRoutes = require('./rental.routes')
const paymentRoutes = require('./paymentRoutes')
const statisticsRoutes = require('./statistics.routes')
const carRoutes = require('./car.routes')
const expenseRoutes = require('./expense.routes')
const calendarNoteRoutes = require('./calendarNoteRoutes')

router.use('/customers', customerRoutes)
router.use('/products', productRoutes)
router.use('/rentals', rentalRoutes)
router.use('/payments', paymentRoutes)
router.use('/statistics', statisticsRoutes)
router.use('/cars', carRoutes)
router.use('/expenses', expenseRoutes)
router.use('/calendar-notes', calendarNoteRoutes)

module.exports = router