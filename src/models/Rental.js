const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },
        carNumber: {
            type: String,
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
                quantity: { type: Number, required: true }, // Qaytarilgan miqdor
                returnDate: { type: Date, required: true },
                cost: { 
                    type: Number,
                    default: 0 // Set default value to 0
                },
            }
        ],
        totalCost: { 
            type: Number,
            required: true,
            default: 0
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'cancelled'],
            default: 'active',
        },
        startDate: { type: Date, required: true, default: Date.now },
        endDate: { type: Date, required: true, default: Date.now }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Rental", rentalSchema);
