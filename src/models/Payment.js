const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
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
        default: 0 // Default value of 0 for discount
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    paymentType: {
        type: String,
        enum: ['cash', 'card'],
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
