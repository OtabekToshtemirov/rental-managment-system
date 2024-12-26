const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true,
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
        paymentMethod: {
            type: String,
            enum: ['cash', 'card'],
            required: true,
            default: 'cash',
        },
        memo: {
            type: String,
        }
    },
    {timestamps: true}
)

module.exports = mongoose.model('Payment', paymentSchema)
