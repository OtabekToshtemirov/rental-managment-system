const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true,
        },
        rental: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Rental',
        },
        amount: {
            type: Number,
            required: true,
        },
        paymentDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        paymentType: {
            type: String,
            enum: ['cash', 'card', 'transfer'],
            required: true,
            default: 'cash',
        },
        isPrepaid: {
            type: Boolean,
            default: false
        },
        description: {
            type: String,
        }
    },
    {timestamps: true}
);

module.exports = mongoose.model('Payment', paymentSchema);