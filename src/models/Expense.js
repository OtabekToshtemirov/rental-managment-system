const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    description: {
        type: String,
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true,
        enum: ['maosh','elektr', 'suv', 'transport', 'boshqa', 'soliq', 'xaridlar', 'tamir']
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['karta', 'naqd']
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
