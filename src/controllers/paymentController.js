const Payments = require('../models/Payments')
const Customers = require('../models/Customer')

// Create a new payment
exports.createPayment = async (req, res) => {
    try {
        const payment = new Payments(req.body)
        // summani mijozning hisob raqamiga qo'shamiz
        const customer = await Customers.findById(payment.customer)
        if (!customer)
            return res.status(404).json({message: 'Customer not found'})
        customer.balance += payment.amount

        await payment.save()
        await customer.save()
        res.status(201).json(payment)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
}

// Get all payments

exports.getAllPayments = async (req, res) => {
    try {
        const payments = await Payments.find()
        res.json(payments)
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

// Get a payment by ID

exports.getPaymentById = async (req, res) => {
    try {
        const payment = await Payments.findById(req.params.id)
        if (!payment)
            return res.status(404).json({message: 'Payment not found'})
        res.json(payment)
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

// Update a payment by ID

exports.updatePayment = async (req, res) => {
    try {
        const payment = await Payments.findByIdAndUpdate(req.params.id, req.body)
        if (!payment)
            return res.status(404).json({message: 'Payment not found'})
        res.json(payment)

    } catch (error) {
        res.status(400).json({message: error.message})
    }
}

// Delete a payment by ID

exports.deletePayment = async (req, res) => {
    try {
        const payment = await Payments.findByIdAndDelete(req.params.id)
        if (!payment)
            return res.status(404).json({message: 'Payment not found'})
        res.json({message: 'Payment deleted successfully'})
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

// Get all payments by customer ID

exports.getPaymentsByCustomerId = async (req, res) => {
    try {
        const payments = await Payments.find({customer: req.params.id})
        res.json(payments)
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}