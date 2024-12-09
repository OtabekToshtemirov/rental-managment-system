const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true,
        enum: ['maosh','elektr', 'suv', 'transport', 'boshqa']
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
    },
    notes: String,
    attachments: [{
        filename: String,
        path: String,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
