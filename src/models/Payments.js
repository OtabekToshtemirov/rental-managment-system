const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        rental: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Rental',
            required: true
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: [0, 'To\'lov summasi 0 dan kam bo\'lmasligi kerak']
        },
        discount: {
            type: Number,
            default: 0,
            min: [0, 'Chegirma summasi 0 dan kam bo\'lmasligi kerak']
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