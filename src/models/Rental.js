const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },
        car: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Car"
        },
        borrowedProducts: [
            {
                product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
                quantity: { type: Number, required: true }, // Olib ketilgan miqdor
                startDate: { type: Date, required: true },
                endDate: { type: Date },
            }
        ],
        returnedProducts: [
            {
                product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
                quantity: { type: Number, required: true },
                startDate: { type: Date, required: true },
                returnDate: { type: Date, required: true },
                cost: { 
                    type: Number,
                    default: 0 
                },
            }
        ],
        totalCost: { 
            type: Number,
            required: true,
            default: 0
        },
        payedAmount: { 
            type: Number,
            required: true,
            default: 0
        },
        debt: { 
            type: Number,
            required: true,
            default: 0
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'cancelled'],
            default: 'active',
        },
        workStartDate: { type: Date, required: true, default: Date.now },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Rental", rentalSchema);
