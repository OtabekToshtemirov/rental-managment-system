const mongoose = require('mongoose')

const rentalSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },
        products: [{
            product: {type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true},
            quantity: {type: Number, required: true, default: 1},
        }],
        startDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        endDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        carNumber: {
            type: String,
        },
        totalCost: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'cancelled'],
            default: 'active',
        },
    },
    {timestamps: true}
)

module.exports = mongoose.model('Rental', rentalSchema)
