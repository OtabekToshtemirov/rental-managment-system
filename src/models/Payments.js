const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        rental: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Rental',
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        discount: {
            type: Number,
            default: 0
        },
        paymentDate: {
            type: Date,
            default: Date.now
        },
        paymentType: {
            type: String,
            enum: ['cash', 'card'],
            required: true,
            default: 'cash'
        },
        description: {
            type: String
        }
    },
    {timestamps: true}
);

module.exports = mongoose.model('Payment', paymentSchema);