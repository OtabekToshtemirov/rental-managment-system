const Payments = require('../models/Payments')
const Customers = require('../models/Customer')
const Rentals = require('../models/Rental')
const moment = require('moment')

// Create a new payment
exports.createPayment = async (req, res) => {
    try {
        console.log('Payment request body:', req.body);
        const { rental, customer, amount, paymentType = 'cash', discount = 0, description } = req.body;

        if (!customer) {
            return res.status(400).json({ message: 'Customer ID is required' });
        }
        if (!amount) {
            return res.status(400).json({ message: 'Amount is required' });
        }

        // Create payment object with valid date
        const payment = new Payments({
            rental,
            customer,
            amount: Number(amount),
            paymentType,
            discount: Number(discount),
            description,
            paymentDate: new Date(),
        });

        console.log('Created payment object:', payment.toObject());

        // Update customer balance
        const customerData = await Customers.findById(customer);
        if (customerData) {
            customerData.balance = (customerData.balance || 0) + Number(amount);
            await customerData.save();
        }

        // Save payment
        await payment.save();

        console.log('Saved payment with discount:', {
            paymentId: payment._id,
            amount: payment.amount,
            discount: payment.discount
        });

        // Populate payment data
        const populatedPayment = await Payments.findById(payment._id)
            .populate({
                path: 'rental',
                populate: {
                    path: 'customer'
                }
            })
            .populate('customer');

        res.status(201).json({  
            success: true,
            payment: populatedPayment
        });
    } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to create payment'
        });
    }
};

// Get all payments
exports.getAllPayments = async (req, res) => {
    try {
        const payments = await Payments.find()
        res.json(payments)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Get a payment by ID
exports.getPaymentById = async (req, res) => {
    try {
        const payment = await Payments.findById(req.params.id)
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' })
        }
        res.json(payment)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Update a payment by ID
exports.updatePayment = async (req, res) => {
    try {
        // First get the old payment to update customer balance
        const oldPayment = await Payments.findById(req.params.id);
        if (!oldPayment) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        
        // Get customer and update balance
        const customer = await Customers.findById(oldPayment.customer);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        // Adjust customer balance
        customer.balance -= oldPayment.amount; // Remove old amount
        customer.balance += req.body.amount; // Add new amount
        
        // Update payment
        const payment = await Payments.findByIdAndUpdate(
            req.params.id, 
            req.body,
            { new: true }
        );
        
        await customer.save();
        
        res.json(payment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

// Delete a payment by ID
exports.deletePayment = async (req, res) => {
    try {
        const payment = await Payments.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        
        // Get customer and update balance
        const customer = await Customers.findById(payment.customer);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        // Adjust customer balance
        customer.balance -= payment.amount;
        
        await Payments.findByIdAndDelete(req.params.id);
        await customer.save();
        
        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Get all payments by customer ID
exports.getPaymentsByCustomerId = async (req, res) => {
    try {
        const payments = await Payments.find({ customer: req.params.id })
        res.json(payments)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Get daily payment statistics
exports.getDailyPaymentStats = async (req, res) => {
    try {
        const date = req.query.date ? moment(req.query.date).startOf('day') : moment().startOf('day')
        const endDate = moment(date).endOf('day')

        const stats = await Payments.aggregate([
            {
                $match: {
                    createdAt: { $gte: date.toDate(), $lte: endDate.toDate() }
                }
            },
            {
                $group: {
                    _id: null,
                    totalPayments: { $sum: 1 },
                    totalAmount: { $sum: "$amount" },
                    averageAmount: { $avg: "$amount" }
                }
            }
        ])

        res.json({
            success: true,
            date: date.format('YYYY-MM-DD'),
            data: stats[0] || {
                totalPayments: 0,
                totalAmount: 0,
                averageAmount: 0
            }
        })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
}

// Get weekly payment statistics
exports.getWeeklyPaymentStats = async (req, res) => {
    try {
        const startDate = req.query.startDate
            ? moment(req.query.startDate).startOf('week')
            : moment().startOf('week')
        const endDate = moment(startDate).endOf('week')

        const stats = await Payments.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$createdAt" },
                    totalPayments: { $sum: 1 },
                    totalAmount: { $sum: "$amount" },
                    averageAmount: { $avg: "$amount" }
                }
            },
            { $sort: { "_id": 1 } }
        ])

        res.json({
            success: true,
            weekStart: startDate.format('YYYY-MM-DD'),
            weekEnd: endDate.format('YYYY-MM-DD'),
            data: stats
        })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
}

// Get monthly payment statistics
exports.getMonthlyPaymentStats = async (req, res) => {
    try {
        const date = req.query.date
            ? moment(req.query.date).startOf('month')
            : moment().startOf('month')
        const endDate = moment(date).endOf('month')

        const stats = await Payments.aggregate([
            {
                $match: {
                    createdAt: { $gte: date.toDate(), $lte: endDate.toDate() }
                }
            },
            {
                $group: {
                    _id: { $dayOfMonth: "$createdAt" },
                    totalPayments: { $sum: 1 },
                    totalAmount: { $sum: "$amount" },
                    averageAmount: { $avg: "$amount" }
                }
            },
            { $sort: { "_id": 1 } }
        ])

        res.json({
            success: true,
            month: date.format('YYYY-MM'),
            data: stats
        })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
}

// Get yearly payment statistics
exports.getYearlyPaymentStats = async (req, res) => {
    try {
        const year = req.query.year ? parseInt(req.query.year) : moment().year()
        const startDate = moment().year(year).startOf('year')
        const endDate = moment().year(year).endOf('year')

        const stats = await Payments.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    totalPayments: { $sum: 1 },
                    totalAmount: { $sum: "$amount" },
                    averageAmount: { $avg: "$amount" }
                }
            },
            { $sort: { "_id": 1 } }
        ])

        res.json({
            success: true,
            year: year,
            data: stats
        })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
}

// Get payment method statistics
exports.getPaymentMethodStats = async (req, res) => {
    try {
        const startDate = req.query.startDate ? moment(req.query.startDate).toDate() : moment().subtract(1, 'year').toDate()
        const endDate = req.query.endDate ? moment(req.query.endDate).toDate() : moment().toDate()

        const stats = await Payments.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: "$paymentType",
                    amount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    method: "$_id",
                    amount: 1,
                    count: 1
                }
            },
            { $sort: { amount: -1 } }
        ])

        res.json({
            success: true,
            data: stats.map(stat => ({
                method: stat.method === 'cash' ? 'Naqd pul' : 'Plastik karta',
                amount: stat.amount,
                count: stat.count
            }))
        })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
}